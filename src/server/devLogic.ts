import testE2eHandler from '../../api/cron/test-e2e.js';

export async function handleE2ETest(req: any, res: any) {
  return testE2eHandler(req, res);
}
