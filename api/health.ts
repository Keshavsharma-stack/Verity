import { handleHealth } from '../src/server/extractionLogic';

export default async function handler(req: any, res: any) {
  return handleHealth(req, res);
}
