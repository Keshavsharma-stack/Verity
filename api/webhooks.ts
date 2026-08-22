import {
  handleCashfreeWebhook,
  handleStripeWebhook,
} from '../src/server/billingLogic.js';

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

    // Capture raw body for signature verification
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    req.body = Buffer.concat(buffers);

    const url = req.url || '';
    const pathParam = (req.query?.path as string) || '';

    if (url.includes('/stripe') || pathParam === 'stripe') {
      return await handleStripeWebhook(req, res);
    }

    // Default to Cashfree webhook handler
    return await handleCashfreeWebhook(req, res);
  } catch (err: any) {
    console.error('Unhandled error in /api/webhooks router:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
