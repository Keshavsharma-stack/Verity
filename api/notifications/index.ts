import { handleGetNotifications } from '../../src/server/notificationLogic';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return await handleGetNotifications(req, res);
  } catch (err: any) {
    console.error('Unhandled error in /api/notifications:', err);
    return res.status(500).json({ error: 'Notification service temporarily unavailable' });
  }
}
