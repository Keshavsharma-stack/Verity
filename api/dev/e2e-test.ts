import { handleE2ETest } from '../../src/server/devLogic.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handleE2ETest(req, res);
}
