import { handleCronProcessExpirations } from '../src/server/notificationLogic.js';
import { handleE2ETest } from '../src/server/devLogic.js';

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

    // Route: /api/cron/test-e2e or /api/dev/e2e-test
    if (
      url.includes('/test-e2e') ||
      url.includes('/e2e-test') ||
      pathParam === 'test-e2e' ||
      pathParam === 'e2e-test' ||
      pathParam.startsWith('test-e2e') ||
      pathParam.startsWith('e2e-test')
    ) {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }
      return await handleE2ETest(req, res);
    }

    // Route: /api/cron/process-expirations (Vercel cron uses GET or POST)
    if (
      url.includes('/process-expirations') ||
      pathParam === 'process-expirations' ||
      pathParam.startsWith('process-expirations') ||
      !pathParam
    ) {
      if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
      }
      return await handleCronProcessExpirations(req, res);
    }

    return res.status(404).json({ success: false, error: 'Cron endpoint not found' });
  } catch (err: any) {
    console.error('Unhandled error in /api/cron router:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Cron service temporarily unavailable' });
  }
}
