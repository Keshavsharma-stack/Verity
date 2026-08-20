import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendTransactionalEmail, EmailDispatchResult } from './emailProvider';
import { renderEmail, EmailTemplateType, EmailTemplateData } from './emailTemplates';
import { evaluateExpiration } from '../lib/expiration';

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

function resolveAppUrl(req: any): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  const origin = req.headers?.origin || req.headers?.['x-forwarded-host'] || req.headers?.host;
  if (origin) {
    const proto = req.headers?.['x-forwarded-proto'] || 'https';
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      return origin.replace(/\/$/, '');
    }
    return `${proto}://${origin}`.replace(/\/$/, '');
  }

  return 'https://app.veritycompliance.com';
}

/**
 * POST /api/reminders/send-notification
 * Authenticated endpoint to trigger a transactional notification email for a contractor/document.
 */
export async function handleSendNotification(req: any, res: any) {
  const reqId = randomUUID();
  console.log(`[handleSendNotification] Started reqId=${reqId}`);
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { 
      workspaceId, 
      contractorId, 
      documentId, 
      templateType = 'MANUAL_RENEWAL_REQUEST', 
      customMessage,
      checkpoint = 'MANUAL_REQUEST',
      recipientEmail: overrideEmail
    } = req.body || {};

    if (!workspaceId || !contractorId) {
      return res.status(400).json({ error: 'Missing required parameters: workspaceId, contractorId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    // 1. Authenticate user
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    // 2. Verify workspace membership (Strict authorization & isolation)
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberData) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    // 3. Verify contractor belongs to this workspace
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (contractorError || !contractor) {
      return res.status(404).json({ error: 'Contractor not found in this workspace' });
    }

    // 4. Fetch document if documentId provided
    let document: any = null;
    if (documentId) {
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('contractor_id', contractorId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (docError || !docData) {
        return res.status(404).json({ error: 'Document not found in this workspace' });
      }
      document = docData;
    }

    // 5. Determine target recipient email
    const recipientEmail = overrideEmail || contractor.email;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'No valid recipient email available for contractor' });
    }

    // 6. Build template data
    const appUrl = resolveAppUrl(req);
    const exp = document?.expires_at ? evaluateExpiration(document.expires_at) : null;

    const templateData: EmailTemplateData = {
      contractorName: contractor.company_name,
      contractorTrade: contractor.trade,
      documentName: document?.name || 'Compliance Document',
      documentType: document?.type || 'Certificate / License',
      expirationDate: document?.expires_at ? new Date(document.expires_at).toISOString().split('T')[0] : undefined,
      daysRemaining: exp?.daysRemaining,
      requiredAction: customMessage,
      appUrl,
    };

    const rendered = renderEmail(templateType as EmailTemplateType, templateData);

    // 7. Dispatch email via server-side abstraction
    const dispatchResult: EmailDispatchResult = await sendTransactionalEmail({
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    const nowIso = new Date().toISOString();
    const reminderStatus = dispatchResult.success ? 'SENT' : (dispatchResult.status === 'CONFIG_REQUIRED' ? 'PENDING' : 'FAILED');
    const errorMessage = dispatchResult.error || undefined;

    // 8. Update / Upsert into reminders table (Audit & Idempotency)
    let reminderRecord: any = null;
    try {
      const { data: remData } = await supabase
        .from('reminders')
        .upsert(
          {
            workspace_id: workspaceId,
            contractor_id: contractorId,
            document_id: documentId || null,
            checkpoint,
            scheduled_for: nowIso,
            sent_at: dispatchResult.success ? nowIso : null,
            status: reminderStatus,
            recipient_email: recipientEmail,
            error_message: errorMessage || null,
            attempt_count: 1,
          },
          { onConflict: 'document_id,checkpoint' }
        )
        .select()
        .maybeSingle();

      reminderRecord = remData;
    } catch {
      // Table insert fallback if RLS or unique constraint allows
    }

    // 9. Write audit log entry in activities table
    try {
      const actionTitle = dispatchResult.success
        ? 'NOTIFICATION_DISPATCHED'
        : dispatchResult.status === 'CONFIG_REQUIRED'
        ? 'RENEWAL_REQUEST_RECORDED'
        : 'NOTIFICATION_FAILED';

      const actionDesc = dispatchResult.success
        ? `Dispatched ${templateType} email notification to ${recipientEmail} for ${contractor.company_name}`
        : dispatchResult.status === 'CONFIG_REQUIRED'
        ? `Recorded renewal request for ${contractor.company_name} (${document?.name || 'document'}). Email delivery pending (email service not configured).`
        : `Failed to dispatch notification to ${recipientEmail}: ${errorMessage || 'Unknown error'}`;

      await supabase.from('activities').insert({
        workspace_id: workspaceId,
        contractor_id: contractorId,
        document_id: documentId || null,
        user_id: userId,
        action: actionTitle,
        description: actionDesc,
      });
    } catch {
      // Activity insert non-blocking
    }

    if (!dispatchResult.success) {
      if (dispatchResult.status === 'CONFIG_REQUIRED') {
        return res.status(200).json({
          success: true,
          emailSent: false,
          status: 'CONFIG_REQUIRED',
          message: 'Renewal request recorded in database. Email delivery pending (Email service not configured in server environment).',
          provider: dispatchResult.provider,
          recipientEmail,
          reminder: reminderRecord,
        });
      }

      return res.status(500).json({
        success: false,
        emailSent: false,
        status: 'FAILED',
        error: dispatchResult.error || 'Internal server error while dispatching email',
        provider: dispatchResult.provider,
        recipientEmail,
        reminder: reminderRecord,
      });
    }

    return res.status(200).json({
      success: true,
      emailSent: true,
      status: 'SENT',
      message: `Renewal email dispatched successfully to ${recipientEmail}`,
      provider: dispatchResult.provider,
      messageId: dispatchResult.messageId,
      recipientEmail,
      reminder: reminderRecord,
    });
  } catch (err: any) {
    console.error(`Error reqId=${reqId}:`, err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing notification',
    });
  }
}

/**
 * POST /api/reminders/process-queue
 * Processes scheduled/pending reminders across the workspace.
 */
export async function handleProcessQueue(req: any, res: any) {
  const reqId = randomUUID();
  console.log(`[handleProcessQueue] Started reqId=${reqId}`);
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

    // 1. Authenticate user & workspace authorization
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberData) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    // 2. Fetch due scheduled reminders (scheduled_for <= now and status in ('SCHEDULED', 'PENDING', 'FAILED'))
    const nowIso = new Date().toISOString();
    const { data: dueReminders, error: remError } = await supabase
      .from('reminders')
      .select('*, contractors(id, company_name, trade, email), documents(id, name, type, expires_at)')
      .eq('workspace_id', workspaceId)
      .lte('scheduled_for', nowIso)
      .in('status', ['SCHEDULED', 'PENDING'])
      .limit(50);

    if (remError) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const results = [];
    const appUrl = resolveAppUrl(req);

    for (const rem of (dueReminders || [])) {
      const contractor = rem.contractors;
      const document = rem.documents;

      if (!contractor || !contractor.email) {
        continue;
      }

      const exp = document?.expires_at ? evaluateExpiration(document.expires_at) : null;
      const templateType: EmailTemplateType = exp?.isExpired 
        ? 'DOCUMENT_EXPIRED' 
        : 'DOCUMENT_EXPIRING_SOON';

      const templateData: EmailTemplateData = {
        contractorName: contractor.company_name,
        contractorTrade: contractor.trade,
        documentName: document?.name || 'Compliance Policy',
        documentType: document?.type || 'Certificate',
        expirationDate: document?.expires_at ? new Date(document.expires_at).toISOString().split('T')[0] : undefined,
        daysRemaining: exp?.daysRemaining,
        appUrl,
      };

      const rendered = renderEmail(templateType, templateData);
      const dispatchResult = await sendTransactionalEmail({
        to: contractor.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      const newStatus = dispatchResult.success ? 'SENT' : 'FAILED';

      await supabase
        .from('reminders')
        .update({
          status: newStatus,
          sent_at: dispatchResult.success ? new Date().toISOString() : null,
          recipient_email: contractor.email,
          error_message: dispatchResult.error || null,
          attempt_count: (rem.attempt_count || 0) + 1,
        })
        .eq('id', rem.id);

      // Log activity for the queue processing
      try {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contractor_id: contractor.id,
          document_id: document?.id || null,
          user_id: userId,
          action: dispatchResult.success ? 'NOTIFICATION_DISPATCHED' : 'NOTIFICATION_FAILED',
          description: dispatchResult.success
            ? `Dispatched ${templateType} (Queue) to ${contractor.email} for ${contractor.company_name}`
            : `Failed to dispatch (Queue) to ${contractor.email}: ${dispatchResult.error || 'Unknown error'}`,
        });
      } catch {
        // Activity insert non-blocking
      }

      results.push({
        reminderId: rem.id,
        contractor: contractor.company_name,
        document: document?.name,
        status: newStatus,
        error: dispatchResult.error,
      });
    }

    return res.status(200).json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (err: any) {
    console.error(`Error reqId=${reqId}:`, err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing reminder queue',
    });
  }
}
