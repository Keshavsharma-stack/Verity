import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

function getSupabaseAdminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getSupabaseUserClient(authHeader: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

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

/**
 * POST /api/billing/checkout
 */
export async function handleCheckout(req: any, res: any) {
  const reqId = randomUUID();
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    const { workspaceId, planSlug } = req.body || {};
    if (!workspaceId || !planSlug) {
      return res.status(400).json({ error: 'Missing required parameters: workspaceId, planSlug', reqId });
    }

    const userClient = getSupabaseUserClient(authHeader);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
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
      .select('id, name, stripe_customer_id')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found', reqId });
    }

    const stripe = getStripe();
    let customerId = workspace.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.name,
        metadata: { workspaceId: workspace.id }
      });
      customerId = customer.id;

      await adminClient
        .from('workspaces')
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);
    }

    let priceId = '';
    const slugUpper = planSlug.toUpperCase();
    if (slugUpper === 'STARTER') {
      priceId = process.env.STRIPE_PRICE_ID_STARTER || '';
    } else if (slugUpper === 'PRO') {
      priceId = process.env.STRIPE_PRICE_ID_PRO || '';
    }

    if (!priceId) {
      return res.status(400).json({ error: `Stripe price ID for plan ${slugUpper} is not configured`, reqId });
    }

    const origin = resolveAppOrigin(req);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing`,
      metadata: { workspaceId, planSlug: slugUpper }
    });

    return res.status(200).json({ url: session.url, reqId });
  } catch (err: any) {
    console.error(`[Checkout [${reqId}]] Error:`, err);
    return res.status(500).json({ error: 'Internal server error during checkout creation', reqId });
  }
}

/**
 * POST /api/billing/portal
 */
export async function handlePortal(req: any, res: any) {
  const reqId = randomUUID();
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required', reqId });
    }

    const { workspaceId } = req.body || {};
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing workspaceId', reqId });
    }

    const userClient = getSupabaseUserClient(authHeader);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
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

    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('id', workspaceId)
      .single();

    if (!workspace || !workspace.stripe_customer_id) {
      return res.status(400).json({ error: 'No active Stripe customer found for this workspace', reqId });
    }

    const stripe = getStripe();
    const origin = resolveAppOrigin(req);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${origin}/settings/billing`
    });

    return res.status(200).json({ url: portalSession.url, reqId });
  } catch (err: any) {
    console.error(`[Portal [${reqId}]] Error:`, err);
    return res.status(500).json({ error: 'Internal server error during portal creation', reqId });
  }
}

/**
 * POST /api/webhooks/stripe
 */
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
    const rawBody = req.body; // must be Buffer / raw body from express.raw()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Webhook [${reqId}]] Signature verification failed:`, err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const adminClient = getSupabaseAdminClient();

  // 1. Idempotency Check
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
          const subscriptionObj = event.data.object.subscription ? await stripe.subscriptions.retrieve(subscriptionId) as any : (await stripe.subscriptions.retrieve(subscriptionId)) as any;
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
            // Find internal plan id
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
              planSlug = 'STARTER'; // default paid fallback
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
