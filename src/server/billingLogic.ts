import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

function getSupabaseUserClient(authHeader: string) {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    global: { headers: { authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getSupabaseUserClient(authHeaderOrToken: string) {
  let token = (authHeaderOrToken || '').trim();
  while (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim();
  }
  token = token.replace(/^["']|["']$/g, '').trim();

  return createClient(supabaseUrl!, serviceRoleKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// -----------------------------------------------------------------------------
// STRIPE FALLBACK CLIENT & WEBHOK HANDLER (Preserved for rollback safety)
// -----------------------------------------------------------------------------
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key, { apiVersion: '2025-02-28.acacia' as any });
  }
  return stripeClient;
}

function resolveAppOrigin(req: any): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const origin = req.headers?.origin || req.headers?.referer;
  if (origin) {
    try {
      const parsed = new URL(origin);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // ignore
    }
  }
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  return 'https://veritycompliance.app';
}

// -----------------------------------------------------------------------------
// CASHFREE CLIENT & UTILS
// -----------------------------------------------------------------------------
function getCashfreeBaseUrl(): string {
  const env = process.env.CASHFREE_ENV || 'SANDBOX';
  if (env.toUpperCase() === 'PROD' || env.toUpperCase() === 'PRODUCTION') {
    return 'https://api.cashfree.com/pg';
  }
  return 'https://sandbox.cashfree.com/pg';
}

function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secretKey: string
): boolean {
  if (!signature || !timestamp || !secretKey) {
    return false;
  }
  const data = timestamp + "." + rawBody;
  const computedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('base64');
  return computedSignature === signature;
}

// -----------------------------------------------------------------------------
// GET /api/billing/subscription (Unified workspace subscription state)
// -----------------------------------------------------------------------------
export async function handleGetSubscription(req: any, res: any) {
  const reqId = randomUUID();
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    let token = authHeader.trim();
    while (/^bearer\s+/i.test(token)) {
      token = token.replace(/^bearer\s+/i, '').trim();
    }
    token = token.replace(/^["']|["']$/g, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    const workspaceId = req.query?.workspaceId || req.body?.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing required parameter: workspaceId', reqId });
    }

    const userClient = getSupabaseUserClient(token);
    let { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      const adminClient = getSupabaseAdminClient();
      const fallbackResult = await adminClient.auth.getUser(token);
      if (fallbackResult.data?.user && !fallbackResult.error) {
        user = fallbackResult.data.user;
        userError = null;
      }
    }

    if (userError || !user) {
      console.error(`[GetSubscription [${reqId}]] Token validation failed:`, userError?.message || userError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token', reqId });
    }

    const adminClient = getSupabaseAdminClient();

    // Verify workspace membership
    const { data: member, error: memberError } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !member) {
      return res.status(403).json({ error: 'Forbidden: Workspace membership required', reqId });
    }

    const { data: subData } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!subData) {
      const { data: wsData } = await adminClient
        .from('workspaces')
        .select('plan')
        .eq('id', workspaceId)
        .maybeSingle();

      const plan = wsData?.plan ? wsData.plan.toUpperCase() : 'FREE';
      return res.status(200).json({
        plan,
        status: 'active',
        isTrial: false,
        reqId
      });
    }

    const now = new Date();
    const isTrial = subData.trial_end && new Date(subData.trial_end) > now;
    const isActive = subData.status === 'active' || subData.status === 'trialing';

    return res.status(200).json({
      plan: isActive ? (subData.plan || 'FREE') : 'FREE',
      status: subData.status || 'active',
      isTrial: !!isTrial,
      cashfreeSubscriptionId: subData.cashfree_subscription_id || null,
      stripeSubscriptionId: subData.stripe_subscription_id || null,
      reqId
    });
  } catch (err: any) {
    console.error(`[GetSubscription [${reqId}]] Error:`, err);
    return res.status(500).json({ error: 'Billing service temporarily unavailable', reqId });
  }
}

// -----------------------------------------------------------------------------
// POST /api/billing/checkout (Replaced with Cashfree Sandbox Billing)
// -----------------------------------------------------------------------------
export async function handleCheckout(req: any, res: any) {
  const reqId = randomUUID();
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    let token = authHeader.trim();
    while (/^bearer\s+/i.test(token)) {
      token = token.replace(/^bearer\s+/i, '').trim();
    }
    token = token.replace(/^["']|["']$/g, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    const { workspaceId, planSlug } = req.body || {};
    if (!workspaceId || !planSlug) {
      return res.status(400).json({ error: 'Missing required parameters: workspaceId, planSlug', reqId });
    }

    const userClient = getSupabaseUserClient(token);
    let { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      const adminClient = getSupabaseAdminClient();
      const fallbackResult = await adminClient.auth.getUser(token);
      if (fallbackResult.data?.user && !fallbackResult.error) {
        user = fallbackResult.data.user;
        userError = null;
      }
    }

    if (userError || !user) {
      console.error(`[Checkout [${reqId}]] Token validation failed:`, userError?.message || userError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token', reqId });
    }

    const adminClient = getSupabaseAdminClient();

    // Verify workspace membership and ADMIN role
    const { data: member, error: memberError } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !member || member.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Workspace ADMIN role required', reqId });
    }

    // Fetch workspace
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found', reqId });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secretKey) {
      return res.status(500).json({ error: 'Cashfree credentials are not configured on the server', reqId });
    }

    let planId = '';
    const slugUpper = planSlug.toUpperCase();
    if (slugUpper === 'STARTER') {
      planId = process.env.CASHFREE_PLAN_STARTER || 'plan_starter';
    } else if (slugUpper === 'PRO') {
      planId = process.env.CASHFREE_PLAN_PRO || 'plan_pro';
    } else {
      return res.status(400).json({ error: `Invalid plan slug: ${planSlug}`, reqId });
    }

    const origin = resolveAppOrigin(req);
    const subscriptionId = `sub_ws_${workspaceId}_${Date.now()}`;

    // Clean phone input for Cashfree requirements
    const customerPhone = '9999999999';

    const cashfreePayload = {
      subscription_id: subscriptionId,
      plan_details: {
        plan_id: planId
      },
      customer_details: {
        customer_name: workspace.name || 'Workspace Administrator',
        customer_email: user.email || 'billing@veritycompliance.app',
        customer_phone: customerPhone
      },
      subscription_meta: {
        return_url: `${origin}/settings/billing?cf_sub_id={sub_id}`
      }
    };

    const cashfreeUrl = `${getCashfreeBaseUrl()}/subscriptions`;
    console.log(`[Checkout [${reqId}]] Calling Cashfree Sandbox API: ${cashfreeUrl}`);

    const cfResponse = await fetch(cashfreeUrl, {
      method: 'POST',
      headers: {
        'X-Client-Id': appId,
        'X-Client-Secret': secretKey,
        'x-api-version': '2026-01-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cashfreePayload)
    });

    const cfData = await cfResponse.json() as any;

    if (!cfResponse.ok) {
      console.error(`[Checkout [${reqId}]] Cashfree API error:`, cfData);
      return res.status(400).json({
        error: cfData.message || 'Failed to create subscription session with Cashfree',
        reqId
      });
    }

    const authLink = cfData.auth_link || cfData.authLink;
    if (!authLink) {
      console.error(`[Checkout [${reqId}]] Cashfree response missing authLink:`, cfData);
      return res.status(500).json({ error: 'Authorization URL was not generated by Cashfree', reqId });
    }

    // Save pending Cashfree subscription mapping in local DB
    const { data: planRecord } = await adminClient
      .from('plans')
      .select('id')
      .eq('slug', slugUpper)
      .maybeSingle();

    await adminClient
      .from('subscriptions')
      .upsert({
        workspace_id: workspaceId,
        plan_id: planRecord?.id || null,
        plan: slugUpper,
        status: 'initialized',
        cashfree_subscription_id: subscriptionId,
        cashfree_plan_id: planId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'workspace_id' });

    return res.status(200).json({ url: authLink, reqId });
  } catch (err: any) {
    console.error(`[Checkout [${reqId}]] Error:`, err);
    return res.status(500).json({ error: 'Internal server error during checkout creation', reqId });
  }
}

// -----------------------------------------------------------------------------
// POST /api/billing/portal (Custom Self-Service Cancel / Rollback Safe portal)
// -----------------------------------------------------------------------------
export async function handlePortal(req: any, res: any) {
  const reqId = randomUUID();
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    let token = authHeader.trim();
    while (/^bearer\s+/i.test(token)) {
      token = token.replace(/^bearer\s+/i, '').trim();
    }
    token = token.replace(/^["']|["']$/g, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    const { workspaceId } = req.body || {};
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing workspaceId', reqId });
    }

    const userClient = getSupabaseUserClient(token);
    let { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      const adminClient = getSupabaseAdminClient();
      const fallbackResult = await adminClient.auth.getUser(token);
      if (fallbackResult.data?.user && !fallbackResult.error) {
        user = fallbackResult.data.user;
        userError = null;
      }
    }

    if (userError || !user) {
      console.error(`[Portal [${reqId}]] Token validation failed:`, userError?.message || userError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token', reqId });
    }

    const adminClient = getSupabaseAdminClient();

    const { data: member } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Workspace ADMIN role required', reqId });
    }

    const { data: subscription } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    // ROLLBACK SAFETY: If legacy Stripe subscription is active, direct to Stripe portal instead
    if (subscription?.stripe_subscription_id && !subscription?.cashfree_subscription_id) {
      if (subscription.stripe_customer_id) {
        const stripe = getStripe();
        const origin = resolveAppOrigin(req);
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: subscription.stripe_customer_id,
          return_url: `${origin}/settings/billing`
        });
        return res.status(200).json({ url: portalSession.url, reqId });
      }
    }

    const cashfreeSubId = subscription?.cashfree_subscription_id;
    if (!cashfreeSubId) {
      return res.status(400).json({ error: 'No active Cashfree subscription found to cancel', reqId });
    }

    if (!appId || !secretKey) {
      return res.status(500).json({ error: 'Cashfree credentials are not configured', reqId });
    }

    const cancelUrl = `${getCashfreeBaseUrl()}/subscriptions/${cashfreeSubId}/manage`;
    console.log(`[Portal [${reqId}]] Calling Cashfree Cancel API: ${cancelUrl}`);

    const cfResponse = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'X-Client-Id': appId,
        'X-Client-Secret': secretKey,
        'x-api-version': '2026-01-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'CANCEL'
      })
    });

    const cfData = await cfResponse.json() as any;

    if (!cfResponse.ok) {
      console.error(`[Portal [${reqId}]] Cashfree cancel error:`, cfData);
      return res.status(400).json({
        error: cfData.message || 'Failed to cancel subscription with Cashfree',
        reqId
      });
    }

    // Downgrade subscription state locally to FREE instantly
    await adminClient
      .from('subscriptions')
      .update({
        plan: 'FREE',
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('workspace_id', workspaceId);

    await adminClient.from('activities').insert({
      workspace_id: workspaceId,
      action: 'SUBSCRIPTION_CANCELED',
      description: 'Subscription cancelled directly by Administrator via Cashfree API.'
    });

    const origin = resolveAppOrigin(req);
    return res.status(200).json({ url: `${origin}/settings/billing?cancelled=true`, reqId });
  } catch (err: any) {
    console.error(`[Portal [${reqId}]] Error:`, err);
    return res.status(500).json({ error: 'Internal server error during portal action', reqId });
  }
}

// -----------------------------------------------------------------------------
// POST /api/webhooks/cashfree (Webhook signature validation & idempotency)
// -----------------------------------------------------------------------------
export async function handleCashfreeWebhook(req: any, res: any) {
  const reqId = randomUUID();
  const signature = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'];
  const timestamp = req.headers['x-webhook-timestamp'] || req.headers['X-Webhook-Timestamp'];
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!secretKey) {
    console.error(`[CashfreeWebhook [${reqId}]] CASHFREE_SECRET_KEY is not configured`);
    return res.status(500).json({ error: 'Webhook secret key not configured' });
  }

  // Extract raw body
  let rawBody = '';
  if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (req.body) {
    rawBody = JSON.stringify(req.body);
  }

  // 1. Signature Verification
  const isSignatureValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp, secretKey);
  if (!isSignatureValid) {
    console.error(`[CashfreeWebhook [${reqId}]] Signature verification failed.`);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error(`[CashfreeWebhook [${reqId}]] Failed to parse raw body JSON:`, err);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Normalize Cashfree payload structure
  const eventType = body.event_type || body.cf_event;
  const subscriptionId = body.subscription_id || body.cf_subscriptionId || body.subscription_details?.subscription_id;
  const status = body.subscription_status || body.cf_status || body.subscription_details?.subscription_status;
  const planId = body.plan_id || body.cf_planId || body.plan_details?.plan_id || body.subscription_details?.plan_details?.plan_id;

  if (!eventType) {
    console.warn(`[CashfreeWebhook [${reqId}]] No event type found in payload.`);
    return res.status(200).json({ received: true, ignored: true });
  }

  console.log(`[CashfreeWebhook [${reqId}]] Received Cashfree event: "${eventType}" for sub: "${subscriptionId}" with status: "${status}"`);

  const adminClient = getSupabaseAdminClient();

  // 2. Idempotency Check using the event details or signature
  const eventId = body.event_id || body.cf_eventTime || signature || `${subscriptionId}_${status || 'update'}`;
  try {
    const { data: existingEvent } = await adminClient
      .from('cashfree_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[CashfreeWebhook [${reqId}]] Duplicate event "${eventId}" already processed. Skipping.`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    await adminClient
      .from('cashfree_events')
      .insert({ event_id: eventId });
  } catch (dbErr) {
    console.error(`[CashfreeWebhook [${reqId}]] Idempotency check error:`, dbErr);
  }

  // 3. Resolve Workspace ID by cashfree_subscription_id
  let workspaceId = '';
  if (subscriptionId) {
    const { data: subRec } = await adminClient
      .from('subscriptions')
      .select('workspace_id')
      .eq('cashfree_subscription_id', subscriptionId)
      .maybeSingle();

    if (subRec) {
      workspaceId = subRec.workspace_id;
    } else if (subscriptionId.startsWith('sub_ws_')) {
      // Robust regex-free backchannel split
      workspaceId = subscriptionId.split('_')[2];
    }
  }

  if (!workspaceId) {
    console.warn(`[CashfreeWebhook [${reqId}]] Could not map subscription_id "${subscriptionId}" to a workspace.`);
    return res.status(200).json({ received: true, unmapped: true });
  }

  try {
    switch (eventType) {
      case 'SUBSCRIPTION_STATUS_CHANGE': {
        const isPremiumStatus = status === 'ACTIVE';
        const isCancelledStatus = ['CUSTOMER_CANCELLED', 'EXPIRED', 'LINK_EXPIRED'].includes(status);
        const isPausedStatus = ['ON_HOLD', 'CUSTOMER_PAUSED'].includes(status);

        let planSlug = 'FREE';
        let subStatus = 'active';

        if (isPremiumStatus) {
          subStatus = 'active';
          // Resolve plan slug from cashfree plan ID
          if (planId && planId.includes('pro')) {
            planSlug = 'PRO';
          } else {
            planSlug = 'STARTER';
          }
        } else if (isCancelledStatus) {
          planSlug = 'FREE';
          subStatus = 'canceled';
        } else if (isPausedStatus) {
          planSlug = 'FREE';
          subStatus = 'past_due';
        } else {
          // preserve whatever exists or default to free
          return res.status(200).json({ received: true });
        }

        const { data: planRecord } = await adminClient
          .from('plans')
          .select('id')
          .eq('slug', planSlug)
          .maybeSingle();

        await adminClient
          .from('subscriptions')
          .upsert({
            workspace_id: workspaceId,
            plan_id: planRecord?.id || null,
            plan: planSlug,
            status: subStatus,
            cashfree_subscription_id: subscriptionId,
            cashfree_plan_id: planId || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id' });

        await adminClient.from('activities').insert({
          workspace_id: workspaceId,
          action: isPremiumStatus ? 'SUBSCRIPTION_CREATED' : (isCancelledStatus ? 'SUBSCRIPTION_CANCELED' : 'SUBSCRIPTION_UPDATED'),
          description: `Subscription updated to plan ${planSlug} (Cashfree Status: ${status}).`
        });
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_SUCCESS': {
        let planSlug = 'STARTER';
        if (planId && planId.includes('pro')) {
          planSlug = 'PRO';
        }

        const { data: planRecord } = await adminClient
          .from('plans')
          .select('id')
          .eq('slug', planSlug)
          .maybeSingle();

        await adminClient
          .from('subscriptions')
          .upsert({
            workspace_id: workspaceId,
            plan_id: planRecord?.id || null,
            plan: planSlug,
            status: 'active',
            cashfree_subscription_id: subscriptionId,
            cashfree_plan_id: planId || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id' });

        await adminClient.from('activities').insert({
          workspace_id: workspaceId,
          action: 'PAYMENT_SUCCESS',
          description: `Subscription payment of ${planSlug} processed successfully via Cashfree.`
        });
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_FAILED': {
        await adminClient
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('workspace_id', workspaceId);

        await adminClient.from('activities').insert({
          workspace_id: workspaceId,
          action: 'PAYMENT_FAILED',
          description: 'Subscription recurring charge failed on Cashfree. Marked as past_due.'
        });
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`[CashfreeWebhook [${reqId}]] Processing error:`, err);
    return res.status(500).json({ error: 'Webhook event processing error' });
  }
}

// -----------------------------------------------------------------------------
// STRIPE WEBHOOK EVENT HANDLER (Kept intact for legacy checkout rollbacks)
// -----------------------------------------------------------------------------
export async function handleStripeWebhook(req: any, res: any) {
  const reqId = randomUUID();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(`[Webhook [${reqId}]] STRIPE_WEBHOOK_SECRET is not configured`);
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    const rawBody = req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Webhook [${reqId}]] Signature verification failed:`, err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const adminClient = getSupabaseAdminClient();

  try {
    const { data: existingEvent } = await adminClient
      .from('stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    await adminClient
      .from('stripe_events')
      .insert({ event_id: event.id });
  } catch (dbErr) {
    console.error(`[Webhook [${reqId}]] Idempotency check error:`, dbErr);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const workspaceIdMeta = session.metadata?.workspaceId;
        const planSlugMeta = session.metadata?.planSlug || 'STARTER';

        if (subscriptionId) {
          const subscriptionObj = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
          const priceId = subscriptionObj.items.data[0]?.price.id;

          let workspaceId = workspaceIdMeta;
          if (!workspaceId && customerId) {
            const { data: ws } = await adminClient
              .from('workspaces')
              .select('id')
              .eq('stripe_customer_id', customerId)
              .maybeSingle();
            if (ws) workspaceId = ws.id;
          }

          if (workspaceId) {
            const { data: planRecord } = await adminClient
              .from('plans')
              .select('id')
              .eq('slug', planSlugMeta.toUpperCase())
              .maybeSingle();

            await adminClient
              .from('subscriptions')
              .upsert({
                workspace_id: workspaceId,
                plan_id: planRecord?.id || null,
                plan: planSlugMeta.toUpperCase(),
                status: subscriptionObj.status,
                stripe_subscription_id: subscriptionId,
                stripe_price_id: priceId,
                current_period_start: subscriptionObj.current_period_start ? new Date(subscriptionObj.current_period_start * 1000).toISOString() : null,
                current_period_end: subscriptionObj.current_period_end ? new Date(subscriptionObj.current_period_end * 1000).toISOString() : null,
                cancel_at_period_end: subscriptionObj.cancel_at_period_end,
                updated_at: new Date().toISOString()
              }, { onConflict: 'workspace_id' });

            await adminClient.from('activities').insert({
              workspace_id: workspaceId,
              action: 'SUBSCRIPTION_CREATED',
              description: `Subscription activated for plan ${planSlugMeta.toUpperCase()} via Stripe Checkout.`
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const subscriptionId = sub.id;
        const priceId = sub.items.data[0]?.price.id;
        const status = sub.status;
        const cancelAtPeriodEnd = sub.cancel_at_period_end;

        const { data: workspace } = await adminClient
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (workspace) {
          let planSlug = 'FREE';
          if (status === 'active' || status === 'trialing') {
            if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
              planSlug = 'PRO';
            } else if (priceId === process.env.STRIPE_PRICE_ID_STARTER) {
              planSlug = 'STARTER';
            } else {
              planSlug = 'STARTER';
            }
          }

          if (event.type === 'customer.subscription.deleted' || status === 'canceled' || status === 'incomplete_expired') {
            planSlug = 'FREE';
          }

          const { data: planRecord } = await adminClient
            .from('plans')
            .select('id')
            .eq('slug', planSlug)
            .maybeSingle();

          await adminClient
            .from('subscriptions')
            .upsert({
              workspace_id: workspace.id,
              plan_id: planRecord?.id || null,
              plan: planSlug,
              status,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
              current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              cancel_at_period_end: cancelAtPeriodEnd,
              updated_at: new Date().toISOString()
            }, { onConflict: 'workspace_id' });

          await adminClient.from('activities').insert({
            workspace_id: workspace.id,
            action: event.type === 'customer.subscription.deleted' ? 'SUBSCRIPTION_CANCELED' : 'SUBSCRIPTION_UPDATED',
            description: `Subscription updated to ${planSlug} (Status: ${status}).`
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: workspace } = await adminClient
          .from('workspaces')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (workspace) {
          await adminClient
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('workspace_id', workspace.id);

          await adminClient.from('activities').insert({
            workspace_id: workspace.id,
            action: 'PAYMENT_FAILED',
            description: 'Stripe invoice payment failed. Subscription marked past_due.'
          });
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`[Webhook [${reqId}]] Processing error:`, err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
