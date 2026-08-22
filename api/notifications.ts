import {
  handleGetNotifications,
  handleScanNotifications,
  handleUpdateNotificationRead,
  handleMarkAllNotificationsRead,
} from '../src/server/notificationLogic';

export default async function handler(req: any, res: any) {
  try {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // ignore
      }
    }

    const url = req.url || '';
    const pathParam = (req.query?.path as string) || '';

    // Route: /api/notifications/scan
    if (url.includes('/scan') || pathParam === 'scan' || pathParam.startsWith('scan')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleScanNotifications(req, res);
    }

    // Route: /api/notifications/mark-all-read
    if (url.includes('/mark-all-read') || pathParam === 'mark-all-read' || pathParam.startsWith('mark-all-read')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleMarkAllNotificationsRead(req, res);
    }

    // Route: /api/notifications/:id/read
    if (url.includes('/read') || pathParam.endsWith('/read') || pathParam.includes('read')) {
      if (req.method !== 'PATCH' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      // If pathParam has id (e.g. "123/read"), extract it
      const match = pathParam.match(/^([^/]+)\/read/);
      if (match) {
        req.query = req.query || {};
        req.query.id = match[1];
      }
      return await handleUpdateNotificationRead(req, res);
    }

    // Route: /api/notifications (GET)
    if (req.method === 'GET') {
      return await handleGetNotifications(req, res);
    }

    return res.status(404).json({ error: 'Notifications endpoint not found' });
  } catch (err: any) {
    console.error('Unhandled error in /api/notifications router:', err);
    return res.status(500).json({ error: 'Notification service temporarily unavailable' });
  }
}
