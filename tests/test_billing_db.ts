import { supabase } from '../src/lib/supabase';
import { billingService } from '../src/services/billingService';

async function runDbTest() {
  const { data: workspaces } = await supabase.from('workspaces').select('*').limit(1);
  if (!workspaces || workspaces.length === 0) {
    console.error('No workspaces found.');
    return;
  }
  
  const workspaceId = workspaces[0].id;
  console.log('Testing with workspaceId:', workspaceId);

  const sub = await billingService.getWorkspaceSubscription(workspaceId);
  console.log('Subscription:', sub);

  const usage = await billingService.getWorkspaceUsage(workspaceId);
  console.log('Usage:', JSON.stringify(usage, null, 2));

  process.exit(0);
}
runDbTest();
