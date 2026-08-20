import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendTransactionalEmail, EmailDispatchResult } from './emailProvider';
import { renderEmail, EmailTemplateType, EmailTemplateData } from './emailTemplates';
import { calculateDaysRemaining, evaluateExpiration } from '../lib/expiration';

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export function getSupabaseUserClient(authHeader?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}

function resolveAppUrl(req?: any): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  if (req?.headers) {
    const origin = req.headers?.origin || req.headers?.['x-forwarded-host'] || req.headers?.host;
    if (origin) {
      const proto = req.headers?.['x-forwarded-proto'] || 'https';
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        return origin.replace(/\/$/, '');
      }
      return `${proto}://${origin}`.replace(/\/$/, '');
    }
  }

  return 'https://app.veritycompliance.com';
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return String(dateStr);
  }
}

export interface CheckpointDefinition {
  checkpoint: '30_DAYS' | '15_DAYS' | '7_DAYS' | '1_DAY' | 'EXPIRATION_DAY' | 'EXPIRED';
  type: string;
  urgency: 'CRITICAL' | 'WARNING' | 'INFO';
  isTriggered: (daysRemaining: number) => boolean;
  getTitle: (docName: string, daysRemaining: number) => string;
  getMessage: (contractorName: string, docName: string, daysRemaining: number, expDate: string) => string;
  emailTemplate: EmailTemplateType;
}

export const NOTIFICATION_CHECKPOINTS: CheckpointDefinition[] = [
  {
    checkpoint: '30_DAYS',
    type: 'EXPIRATION_30_DAYS',
    urgency: 'INFO',
    isTriggered: (days) => days <= 30 && days > 15,
    getTitle: (docName, days) => `Upcoming Expiration (30d): ${docName}`,
    getMessage: (contractor, docName, days, expDate) => 
      `${contractor}'s ${docName} will expire in ${days} days on ${expDate}. Renewal preparation recommended.`,
    emailTemplate: 'DOCUMENT_EXPIRING_SOON',
  },
  {
    checkpoint: '15_DAYS',
    type: 'EXPIRATION_15_DAYS',
    urgency: 'WARNING',
    isTriggered: (days) => days <= 15 && days > 7,
    getTitle: (docName, days) => `Upcoming Expiration (15d): ${docName}`,
    getMessage: (contractor, docName, days, expDate) => 
      `${contractor}'s ${docName} will expire in ${days} days on ${expDate}. Please request replacement certificate.`,
    emailTemplate: 'DOCUMENT_EXPIRING_SOON',
  },
  {
    checkpoint: '7_DAYS',
    type: 'EXPIRATION_7_DAYS',
    urgency: 'CRITICAL',
    isTriggered: (days) => days <= 7 && days > 1,
    getTitle: (docName, days) => `Critical Expiration Alert (≤7d): ${docName}`,
    getMessage: (contractor, docName, days, expDate) => 
      `CRITICAL: ${contractor}'s ${docName} expires in ${days} days on ${expDate}. Urgent action required to avoid site lockout.`,
    emailTemplate: 'DOCUMENT_EXPIRING_SOON',
  },
  {
    checkpoint: '1_DAY',
    type: 'EXPIRATION_1_DAY',
    urgency: 'CRITICAL',
    isTriggered: (days) => days === 1,
    getTitle: (docName) => `Urgent: ${docName} Expires Tomorrow`,
    getMessage: (contractor, docName, _days, expDate) => 
      `URGENT: ${contractor}'s ${docName} expires tomorrow on ${expDate}. Compliance status will lapse at midnight.`,
    emailTemplate: 'DOCUMENT_EXPIRING_SOON',
  },
  {
    checkpoint: 'EXPIRATION_DAY',
    type: 'EXPIRATION_TODAY',
    urgency: 'CRITICAL',
    isTriggered: (days) => days === 0,
    getTitle: (docName) => `Urgent: ${docName} Expires Today`,
    getMessage: (contractor, docName, _days, expDate) => 
      `POLICY EXPIRING TODAY: ${contractor}'s ${docName} reaches expiration today (${expDate}). Automatic non-compliance flag pending.`,
    emailTemplate: 'DOCUMENT_EXPIRING_SOON',
  },
  {
    checkpoint: 'EXPIRED',
    type: 'EXPIRATION_EXPIRED',
    urgency: 'CRITICAL',
    isTriggered: (days) => days < 0,
    getTitle: (docName, days) => `Lapsed Policy: ${docName} is Expired`,
    getMessage: (contractor, docName, days, expDate) => 
      `LAPSED POLICY: ${contractor}'s ${docName} expired ${Math.abs(days)} day(s) ago on ${expDate}. Contractor fails compliance gate.`,
    emailTemplate: 'DOCUMENT_EXPIRED',
  },
];

/**
 * Evaluates document expiration against all valid checkpoints.
 */
export function getTriggeredCheckpointsForDocument(
  expiresAt: string,
  referenceDate?: Date
): CheckpointDefinition[] {
  const days = calculateDaysRemaining(expiresAt, referenceDate);
  if (days === null) return [];

  // Return all checkpoints whose threshold is satisfied
  return NOTIFICATION_CHECKPOINTS.filter(cp => cp.isTriggered(days));
}

/**
 * Scans a single workspace and creates/updates notifications idempotently.
 */
export async function processWorkspaceExpirationScan(
  supabaseClient: any,
  workspaceId: string,
  appUrl: string = 'https://app.veritycompliance.com',
  referenceDate?: Date
): Promise<{
  scannedDocuments: number;
  newNotificationsCount: number;
  duplicatesSkipped: number;
  emailsAttempted: number;
  emailsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let scannedDocuments = 0;
  let newNotificationsCount = 0;
  let duplicatesSkipped = 0;
  let emailsAttempted = 0;
  let emailsSent = 0;

  try {
    // 1. Fetch active documents and their contractors
    const { data: documents, error: docsError } = await supabaseClient
      .from('documents')
      .select('id, name, type, file_url, expires_at, contractor_id, workspace_id')
      .eq('workspace_id', workspaceId)
      .not('expires_at', 'is', null);

    if (docsError) {
      errors.push(`Failed to fetch documents: ${docsError.message}`);
      return { scannedDocuments, newNotificationsCount, duplicatesSkipped, emailsAttempted, emailsSent, errors };
    }

    if (!documents || documents.length === 0) {
      return { scannedDocuments: 0, newNotificationsCount: 0, duplicatesSkipped: 0, emailsAttempted: 0, emailsSent: 0, errors };
    }

    scannedDocuments = documents.length;

    // 2. Fetch contractors in workspace for legal name and email
    const { data: contractors, error: conError } = await supabaseClient
      .from('contractors')
      .select('id, company_name, email, trade')
      .eq('workspace_id', workspaceId);

    if (conError) {
      errors.push(`Failed to fetch contractors: ${conError.message}`);
    }

    const contractorMap = new Map<string, any>();
    for (const con of (contractors || [])) {
      contractorMap.set(con.id, con);
    }

    // 3. Fetch existing notifications in workspace to enforce idempotency
    const { data: existingNotifications } = await supabaseClient
      .from('notifications')
      .select('document_id, checkpoint, expiration_date')
      .eq('workspace_id', workspaceId);

    const existingKeySet = new Set<string>();
    for (const notif of (existingNotifications || [])) {
      if (notif.document_id && notif.checkpoint) {
        const expDateKey = notif.expiration_date ? new Date(notif.expiration_date).toISOString().split('T')[0] : 'PERMANENT';
        existingKeySet.add(`${notif.document_id}::${notif.checkpoint}::${expDateKey}`);
      }
    }

    // 4. Process each document and evaluate checkpoints
    for (const doc of documents) {
      if (!doc.expires_at) continue;

      const contractor = contractorMap.get(doc.contractor_id);
      const contractorName = contractor?.company_name || 'Contractor';
      const daysRemaining = calculateDaysRemaining(doc.expires_at, referenceDate);
      if (daysRemaining === null) continue;

      const expDateDisplay = formatDateDisplay(doc.expires_at);
      const expDateKey = new Date(doc.expires_at).toISOString().split('T')[0];

      const triggeredCheckpoints = getTriggeredCheckpointsForDocument(doc.expires_at, referenceDate);

      for (const cp of triggeredCheckpoints) {
        const idempotencyKey = `${doc.id}::${cp.checkpoint}::${expDateKey}`;

        // Skip if already generated for this exact document, checkpoint, and expiration cycle
        if (existingKeySet.has(idempotencyKey)) {
          duplicatesSkipped++;
          continue;
        }

        const title = cp.getTitle(doc.name, daysRemaining);
        const message = cp.getMessage(contractorName, doc.name, daysRemaining, expDateDisplay);

        // Attempt real server-side email dispatch if contractor has an email
        let emailStatus: 'SENT' | 'NOT_CONFIGURED' | 'FAILED' | 'NONE' = 'NONE';
        let emailSentAt: string | null = null;
        let emailError: string | null = null;

        if (contractor?.email && contractor.email.includes('@')) {
          emailsAttempted++;
          const templateData: EmailTemplateData = {
            contractorName,
            contractorTrade: contractor.trade,
            documentName: doc.name,
            documentType: doc.type,
            expirationDate: expDateDisplay,
            daysRemaining,
            appUrl,
          };

          const rendered = renderEmail(cp.emailTemplate, templateData);
          const dispatchRes: EmailDispatchResult = await sendTransactionalEmail({
            to: contractor.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });

          if (dispatchRes.success) {
            emailStatus = 'SENT';
            emailSentAt = new Date().toISOString();
            emailsSent++;
          } else if (dispatchRes.status === 'CONFIG_REQUIRED') {
            emailStatus = 'NOT_CONFIGURED';
            emailError = 'Email infrastructure not configured in environment';
          } else {
            emailStatus = 'FAILED';
            emailError = dispatchRes.error || 'Email dispatch failed';
          }
        }

        // Insert notification record in database
        try {
          const { error: insertError } = await supabaseClient
            .from('notifications')
            .insert({
              workspace_id: workspaceId,
              contractor_id: doc.contractor_id,
              document_id: doc.id,
              type: cp.type,
              checkpoint: cp.checkpoint,
              title,
              message,
              urgency: cp.urgency,
              document_name: doc.name,
              contractor_name: contractorName,
              expiration_date: doc.expires_at,
              days_remaining: daysRemaining,
              action_url: `/contractors/${doc.contractor_id}`,
              read: false,
              email_status: emailStatus,
              email_sent_at: emailSentAt,
              email_error: emailError,
              metadata: {
                scannedAt: new Date().toISOString(),
                documentType: doc.type,
              },
            });

          if (insertError) {
            errors.push(`Notification insert error for doc ${doc.id}: ${insertError.message}`);
          } else {
            newNotificationsCount++;
            existingKeySet.add(idempotencyKey);
          }
        } catch (insertEx: any) {
          errors.push(`Insert exception for doc ${doc.id}: ${insertEx.message}`);
        }
      }
    }
  } catch (err: any) {
    errors.push(`Workspace scan error: ${err?.message || 'Unknown scan error'}`);
  }

  return { scannedDocuments, newNotificationsCount, duplicatesSkipped, emailsAttempted, emailsSent, errors };
}

/**
 * Scans all active workspaces across the platform.
 */
export async function runGlobalExpirationScan(referenceDate?: Date): Promise<{
  workspacesProcessed: number;
  totalNewNotifications: number;
  totalDuplicatesSkipped: number;
  totalEmailsSent: number;
  totalScannedDocuments: number;
}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.warn('[ExpirationScheduler] Supabase server client not configured, skipping scan.');
    return { workspacesProcessed: 0, totalNewNotifications: 0, totalDuplicatesSkipped: 0, totalEmailsSent: 0, totalScannedDocuments: 0 };
  }

  try {
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id, name');

    if (error || !workspaces) {
      console.error('[ExpirationScheduler] Failed to fetch workspaces:', error?.message);
      return { workspacesProcessed: 0, totalNewNotifications: 0, totalDuplicatesSkipped: 0, totalEmailsSent: 0, totalScannedDocuments: 0 };
    }

    let totalNewNotifications = 0;
    let totalDuplicatesSkipped = 0;
    let totalEmailsSent = 0;
    let totalScannedDocuments = 0;

    for (const ws of workspaces) {
      const res = await processWorkspaceExpirationScan(supabase, ws.id, undefined, referenceDate);
      totalNewNotifications += res.newNotificationsCount;
      totalDuplicatesSkipped += res.duplicatesSkipped;
      totalEmailsSent += res.emailsSent;
      totalScannedDocuments += res.scannedDocuments;
    }

    console.log(`[ExpirationScheduler] Global scan complete: ${workspaces.length} workspaces, ${totalScannedDocuments} documents scanned, ${totalNewNotifications} new notifications, ${totalDuplicatesSkipped} duplicates skipped, ${totalEmailsSent} emails sent.`);
    return {
      workspacesProcessed: workspaces.length,
      totalNewNotifications,
      totalDuplicatesSkipped,
      totalEmailsSent,
      totalScannedDocuments,
    };
  } catch (err: any) {
    console.error('[ExpirationScheduler] Unexpected error during global scan:', err);
    return { workspacesProcessed: 0, totalNewNotifications: 0, totalDuplicatesSkipped: 0, totalEmailsSent: 0, totalScannedDocuments: 0 };
  }
}

/**
 * GET/POST /api/cron/process-expirations
 * Secure scheduled endpoint for global expiration processing.
 * Must be called with a valid CRON_SECRET in the Authorization header.
 */
export async function handleCronProcessExpirations(req: any, res: any) {
  try {
    // Ensure this route is never cached by Vercel or other CDNs
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    
    console.log('[Cron] Execution started for /api/cron/process-expirations');

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[Cron] Authentication Result: FAILED - CRON_SECRET is not configured in the environment.');
      return res.status(500).json({ error: 'Server configuration error: CRON_SECRET missing' });
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('[Cron] Authentication Result: FAILED - Unauthorized attempt to run expiration scheduler.');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Cron] Authentication Result: SUCCESS - Authorized global expiration scan initiated via scheduled endpoint.');
    
    // We execute the global scan. This function already initializes its own Supabase server client
    // using SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
    const result = await runGlobalExpirationScan();

    console.log(`[Cron] Scan details: Documents scanned: ${result.totalScannedDocuments}, Notifications created: ${result.totalNewNotifications}, Duplicates skipped: ${result.totalDuplicatesSkipped}`);
    console.log('[Cron] Execution completed successfully.');

    return res.status(200).json({
      success: true,
      message: 'Expiration scan executed successfully',
      result,
    });
  } catch (err: any) {
    console.error('[Cron] Unexpected error during scheduled scan:', err);
    return res.status(500).json({ error: err?.message || 'Failed to process scheduled scan' });
  }
}

// -----------------------------------------------------------------------------
// EXPRESS ROUTE HANDLERS
// -----------------------------------------------------------------------------

/**
 * GET /api/notifications
 * Lists notifications for the authenticated user's workspace.
 */
export async function handleGetNotifications(req: any, res: any) {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { workspaceId, unreadOnly, urgency, limit = 50 } = req.query || {};
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing required parameter: workspaceId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    // 1. Authenticate user
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    // 2. Verify workspace membership
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberData) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    // 3. Query notifications
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (unreadOnly === 'true' || unreadOnly === true) {
      query = query.eq('read', false);
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    const { data: notifications, error: notifError } = await query;

    if (notifError) {
      return res.status(500).json({ error: notifError.message });
    }

    // Calculate unread count directly
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('read', false);

    return res.status(200).json({
      success: true,
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch notifications' });
  }
}

/**
 * POST /api/notifications/scan
 * Triggers an immediate expiration scan for the workspace.
 */
export async function handleScanNotifications(req: any, res: any) {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { workspaceId, referenceDate } = req.body || {};
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing required parameter: workspaceId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    // 1. Authenticate user
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    // 2. Verify workspace membership
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberData) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    const appUrl = resolveAppUrl(req);
    const parsedRefDate = referenceDate ? new Date(referenceDate) : undefined;
    const scanResult = await processWorkspaceExpirationScan(supabase, workspaceId, appUrl, parsedRefDate);

    return res.status(200).json({
      success: true,
      scanResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to trigger scan' });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read or unread.
 */
export async function handleUpdateNotificationRead(req: any, res: any) {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { id } = req.params;
    const { workspaceId, read = true } = req.body || {};

    if (!id || !workspaceId) {
      return res.status(400).json({ error: 'Missing required parameters: id, workspaceId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    const { data, error } = await supabase
      .from('notifications')
      .update({
        read: Boolean(read),
        read_at: Boolean(read) ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      notification: data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update notification' });
  }
}

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications in a workspace as read.
 */
export async function handleMarkAllNotificationsRead(req: any, res: any) {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { workspaceId } = req.body || {};
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing required parameter: workspaceId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('read', false);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to mark notifications read' });
  }
}
