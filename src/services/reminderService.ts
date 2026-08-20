import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Reminder, ReminderCheckpoint, Document, ReminderStatus } from '../types';
import { parseCalendarDate } from '../lib/expiration';

export interface CheckpointConfig {
  checkpoint: ReminderCheckpoint;
  daysBefore: number;
}

export const CHECKPOINTS: CheckpointConfig[] = [
  { checkpoint: '30_DAYS', daysBefore: 30 },
  { checkpoint: '15_DAYS', daysBefore: 15 },
  { checkpoint: '7_DAYS', daysBefore: 7 },
  { checkpoint: '1_DAY', daysBefore: 1 },
  { checkpoint: 'EXPIRATION_DAY', daysBefore: 0 },
];

function mapReminderFromDB(row: any): Reminder {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    contractorId: row.contractor_id,
    documentId: row.document_id,
    checkpoint: row.checkpoint as ReminderCheckpoint,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at || undefined,
    status: row.status as ReminderStatus,
    recipientEmail: row.recipient_email || undefined,
    errorMessage: row.error_message || undefined,
    attemptCount: row.attempt_count || 0,
    createdAt: row.created_at,
  };
}

export const reminderService = {
  /**
   * Generates scheduled reminder checkpoints for a document idempotently.
   */
  async generateRemindersForDocument(
    workspaceId: string,
    document: Document
  ): Promise<{ success: boolean; createdCount: number; error?: string }> {
    if (!workspaceId || !document.id || !document.contractorId) {
      return { success: false, createdCount: 0, error: 'Invalid parameters' };
    }

    if (!document.expiresAt) {
      return { success: true, createdCount: 0 }; // No expiration date, no reminders needed
    }

    const parsed = parseCalendarDate(document.expiresAt);
    if (!parsed) {
      return { success: true, createdCount: 0 };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: true, createdCount: 0 };
    }

    try {
      const expirationUtc = Date.UTC(parsed.year, parsed.month, parsed.day);
      const rowsToInsert = CHECKPOINTS.map(cp => {
        const scheduledTimeUtc = expirationUtc - cp.daysBefore * 24 * 60 * 60 * 1000;
        return {
          workspace_id: workspaceId,
          contractor_id: document.contractorId,
          document_id: document.id,
          checkpoint: cp.checkpoint,
          scheduled_for: new Date(scheduledTimeUtc).toISOString(),
          status: 'SCHEDULED',
        };
      });

      // Upsert/Insert with ON CONFLICT (document_id, checkpoint) DO NOTHING
      const { data, error } = await supabase
        .from('reminders')
        .upsert(rowsToInsert, {
          onConflict: 'document_id,checkpoint',
          ignoreDuplicates: true,
        })
        .select();

      if (error) {
        return { success: false, createdCount: 0, error: error.message };
      }

      return { success: true, createdCount: data ? data.length : 0 };
    } catch (err: any) {
      return { success: false, createdCount: 0, error: err?.message || 'Failed to generate reminders' };
    }
  },

  /**
   * Synchronizes all documents in a workspace to ensure complete reminder schedule coverage.
   */
  async syncWorkspaceReminders(
    workspaceId: string
  ): Promise<{ success: boolean; totalProcessed: number; error?: string }> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { success: true, totalProcessed: 0 };
    }

    try {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .not('expires_at', 'is', null);

      if (error || !docs) {
        return { success: false, totalProcessed: 0, error: error?.message };
      }

      let count = 0;
      for (const row of docs) {
        const doc: Document = {
          id: row.id,
          contractorId: row.contractor_id,
          workspaceId: row.workspace_id,
          name: row.name,
          type: row.type,
          fileUrl: row.file_url,
          fileSize: row.file_size || 0,
          status: row.status,
          uploadedAt: row.uploaded_at,
          expiresAt: row.expires_at,
        };

        const res = await this.generateRemindersForDocument(workspaceId, doc);
        if (res.success) {
          count += res.createdCount;
        }
      }

      return { success: true, totalProcessed: count };
    } catch (err: any) {
      return { success: false, totalProcessed: 0, error: err?.message };
    }
  },

  /**
   * List reminders for a workspace or contractor with rich metadata.
   */
  async listReminders(
    workspaceId: string,
    options?: { contractorId?: string; status?: string }
  ): Promise<{ data: Reminder[]; error?: string }> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { data: [] };
    }

    try {
      let query = supabase
        .from('reminders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('scheduled_for', { ascending: true });

      if (options?.contractorId) {
        query = query.eq('contractor_id', options.contractorId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data || []).map(mapReminderFromDB) };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to list reminders' };
    }
  },

  /**
   * Dispatches a renewal request or reminder through the real server-side email endpoint.
   */
  async sendManualRenewalRequest(
    workspaceId: string,
    documentId: string,
    contractorId: string,
    documentName?: string,
    customMessage?: string
  ): Promise<{ 
    success: boolean; 
    emailSent?: boolean;
    status?: string;
    message?: string;
    provider?: string; 
    reminder?: Reminder; 
    error?: string;
    recipientEmail?: string;
  }> {
    if (!workspaceId || !documentId || !contractorId) {
      return { success: false, error: 'Required IDs missing' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: true, emailSent: false, status: 'PENDING', message: 'Renewal request recorded locally' };
    }

    try {
      // 1. Get authenticated session token
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (token) {
        // Trigger real server-side email dispatch
        const response = await fetch('/api/reminders/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            workspaceId,
            contractorId,
            documentId,
            templateType: 'MANUAL_RENEWAL_REQUEST',
            customMessage,
            checkpoint: 'MANUAL_REQUEST',
          }),
        });

        const resData: any = await response.json().catch(() => ({}));

        if (response.ok && resData.success) {
          return {
            success: true,
            emailSent: Boolean(resData.emailSent),
            status: resData.status,
            message: resData.message,
            provider: resData.provider,
            recipientEmail: resData.recipientEmail,
            reminder: resData.reminder ? mapReminderFromDB(resData.reminder) : undefined,
          };
        }

        // Return real server response / configuration required note
        return {
          success: false,
          emailSent: false,
          status: resData.status || 'FAILED',
          message: resData.message,
          provider: resData.provider,
          error: resData.error || `Server returned error status ${response.status}`,
          recipientEmail: resData.recipientEmail,
          reminder: resData.reminder ? mapReminderFromDB(resData.reminder) : undefined,
        };
      }

      // Fallback if token unavailable
      return { success: false, error: 'Authentication required. Please sign in.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch renewal request' };
    }
  },

  /**
   * Process all due scheduled reminders across the workspace via server queue.
   */
  async processReminderQueue(workspaceId: string): Promise<{
    success: boolean;
    processedCount?: number;
    results?: any[];
    error?: string;
  }> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { success: true, processedCount: 0 };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (!token) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch('/api/reminders/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      const data: any = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        return {
          success: true,
          processedCount: data.processedCount || 0,
          results: data.results || [],
        };
      }

      return {
        success: false,
        error: data.error || `Queue processing returned status ${response.status}`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to process reminder queue' };
    }
  },
};
