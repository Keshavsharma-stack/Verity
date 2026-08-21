import { handleScanNotifications } from '../../src/server/notificationLogic';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // ignore
      }
    }
    return await handleScanNotifications(req, res);
  } catch (err: any) {
    console.error('Unhandled error in /api/notifications/scan:', err);
    return res.status(500).json({ error: 'Notification scan service temporarily unavailable' });
  }
}
