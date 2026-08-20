import { handleStripeWebhook } from '../../src/server/billingLogic.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Buffer helper for raw body in Vercel serverless functions if bodyParser is false
  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  req.body = Buffer.concat(buffers);

  return handleStripeWebhook(req, res);
}
