import { handleCashfreeWebhook } from '../../src/server/billingLogic';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Capture raw body for Cashfree signature verification
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    req.body = Buffer.concat(buffers);

    return await handleCashfreeWebhook(req, res);
  } catch (err: any) {
    console.error('Unhandled error in /api/webhooks/cashfree:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
