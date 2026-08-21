import { handleUpdateNotificationRead } from '../../../src/server/notificationLogic';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'PATCH' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // ignore
      }
    }
    return await handleUpdateNotificationRead(req, res);
  } catch (err: any) {
    console.error('Unhandled error in /api/notifications/[id]/read:', err);
    return res.status(500).json({ error: 'Notification service temporarily unavailable' });
  }
}
