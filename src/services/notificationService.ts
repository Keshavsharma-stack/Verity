import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppNotification, NotificationUrgency, NotificationCheckpoint, NotificationType } from '../types';

export interface NotificationFilterOptions {
  unreadOnly?: boolean;
  urgency?: NotificationUrgency;
  limit?: number;
}

function mapNotificationFromDB(row: any): AppNotification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    contractorId: row.contractor_id || undefined,
    documentId: row.document_id || undefined,
    type: row.type as NotificationType,
    checkpoint: row.checkpoint as NotificationCheckpoint,
    title: row.title,
    message: row.message,
    urgency: row.urgency as NotificationUrgency,
    documentName: row.document_name || 'Document',
    contractorName: row.contractor_name || 'Contractor',
    expirationDate: row.expiration_date || undefined,
    daysRemaining: typeof row.days_remaining === 'number' ? row.days_remaining : null,
    actionUrl: row.action_url || undefined,
    read: Boolean(row.read),
    readAt: row.read_at || undefined,
    emailStatus: row.email_status || 'NOT_CONFIGURED',
    emailSentAt: row.email_sent_at || undefined,
    emailError: row.email_error || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export const notificationService = {
  /**
   * Fetches notifications for a workspace with optional filters.
   */
  async getNotifications(
    workspaceId: string,
    options?: NotificationFilterOptions
  ): Promise<{ data: AppNotification[]; unreadCount: number; error?: string }> {
    if (!workspaceId) {
      return { data: [], unreadCount: 0 };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: [], unreadCount: 0 };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (token) {
        const queryParams = new URLSearchParams();
        queryParams.set('workspaceId', workspaceId);
        if (options?.unreadOnly) queryParams.set('unreadOnly', 'true');
        if (options?.urgency) queryParams.set('urgency', options.urgency);
        if (options?.limit) queryParams.set('limit', String(options.limit));

        const response = await fetch(`/api/notifications?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const resData = await response.json();
          const items = (resData.notifications || []).map(mapNotificationFromDB);
          return {
            data: items,
            unreadCount: typeof resData.unreadCount === 'number' ? resData.unreadCount : items.filter((i: AppNotification) => !i.read).length,
          };
        }
      }

      // Direct Supabase fallback if API route is unreachable
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.eq('read', false);
      }
      if (options?.urgency) {
        query = query.eq('urgency', options.urgency);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) {
        return { data: [], unreadCount: 0, error: error.message };
      }

      const mapped = (data || []).map(mapNotificationFromDB);
      const unreadCount = mapped.filter(n => !n.read).length;

      return { data: mapped, unreadCount };
    } catch (err: any) {
      return { data: [], unreadCount: 0, error: err?.message || 'Failed to fetch notifications' };
    }
  },

  /**
   * Triggers a real server-side scan of document expirations for the workspace.
   */
  async triggerExpirationScan(
    workspaceId: string
  ): Promise<{ success: boolean; scanResult?: any; error?: string }> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase configuration or workspaceId required' };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (!token) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch('/api/notifications/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        return { success: true, scanResult: data.scanResult };
      }

      return { success: false, error: data.error || `Server responded with ${response.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to trigger expiration scan' };
    }
  },

  /**
   * Marks a notification as read or unread.
   */
  async markAsRead(
    notificationId: string,
    workspaceId: string,
    read: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    if (!notificationId || !workspaceId || !isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (token) {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ workspaceId, read }),
        });

        if (response.ok) {
          return { success: true };
        }
      }

      // Direct Supabase fallback
      const { error } = await supabase
        .from('notifications')
        .update({
          read,
          read_at: read ? new Date().toISOString() : null,
        })
        .eq('id', notificationId)
        .eq('workspace_id', workspaceId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update notification status' };
    }
  },

  /**
   * Marks all notifications in a workspace as read.
   */
  async markAllAsRead(workspaceId: string): Promise<{ success: boolean; error?: string }> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Workspace ID required' };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      if (token) {
        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ workspaceId }),
        });

        if (response.ok) {
          return { success: true };
        }
      }

      // Direct Supabase fallback
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
        .eq('read', false);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to mark all as read' };
    }
  },
};
