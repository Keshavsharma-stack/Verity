import {
  handleSendNotification,
  handleProcessQueue,
} from '../src/server/reminderLogic.js';

export default async function handler(req: any, res: any) {
  try {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // ignore
      }
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const url = req.url || '';
    const pathParam = (req.query?.path as string) || '';

    if (url.includes('/send-notification') || pathParam === 'send-notification' || pathParam.startsWith('send-notification')) {
      return await handleSendNotification(req, res);
    }

    if (url.includes('/process-queue') || pathParam === 'process-queue' || pathParam.startsWith('process-queue')) {
      return await handleProcessQueue(req, res);
    }

    return res.status(404).json({ error: 'Reminders endpoint not found' });
  } catch (err: any) {
    console.error('Unhandled error in /api/reminders router:', err);
    return res.status(500).json({ error: 'Reminder service temporarily unavailable' });
  }
}
