import { handleCronProcessExpirations } from '../../src/server/notificationLogic';

export default async function handler(req: any, res: any) {
  // Support both GET and POST (Vercel Cron uses GET)
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  return handleCronProcessExpirations(req, res);
}
