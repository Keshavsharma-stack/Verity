import { handleHealth } from '../src/server/extractionLogic.js';

export default async function handler(req: any, res: any) {
  return handleHealth(req, res);
}
