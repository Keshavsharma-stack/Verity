import {
  handleProcessExtraction,
  handleManualVerification,
} from '../src/server/extractionLogic';

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

    if (url.includes('/verify-manual') || pathParam === 'verify-manual' || pathParam.startsWith('verify-manual')) {
      return await handleManualVerification(req, res);
    }

    if (url.includes('/process-extraction') || pathParam === 'process-extraction' || pathParam.startsWith('process-extraction') || !pathParam) {
      return await handleProcessExtraction(req, res);
    }

    return res.status(404).json({ error: 'Document endpoint not found' });
  } catch (err: any) {
    console.error('Unhandled error in /api/documents router:', err);
    return res.status(500).json({ error: 'Document extraction service temporarily unavailable' });
  }
}
