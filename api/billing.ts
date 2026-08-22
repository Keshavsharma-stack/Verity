import {
  handleGetSubscription,
  handleCheckout,
  handlePortal,
} from '../src/server/billingLogic';

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

    // Route dispatch
    if (url.includes('/checkout') || pathParam === 'checkout' || pathParam.startsWith('checkout')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleCheckout(req, res);
    }

    if (url.includes('/portal') || pathParam === 'portal' || pathParam.startsWith('portal')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handlePortal(req, res);
    }

    if (url.includes('/subscription') || pathParam === 'subscription' || pathParam.startsWith('subscription') || !pathParam) {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleGetSubscription(req, res);
    }

    return res.status(404).json({ error: 'Billing endpoint not found' });
  } catch (err: any) {
    console.error('Unhandled error in /api/billing router:', err);
    return res.status(500).json({ error: 'Billing service temporarily unavailable' });
  }
}
