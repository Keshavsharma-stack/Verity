import { supabase } from '../src/lib/supabase';
import { billingService } from '../src/services/billingService';
import { contractorService } from '../src/services/contractorService';

async function runTests() {
  console.log('--- STARTING BILLING & SAAS ENGINE TESTS ---');

  const email = `test-billing-${Date.now()}@gmail.com`;
  const password = 'testpassword123';

  console.log('1. Signing up test user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Billing Tester', company_name: 'Test Corp' }
    }
  });

  if (signUpError) {
    console.error('Sign up failed', signUpError);
    return;
  }

  // Wait for triggers to create workspace and subscription
  await new Promise(r => setTimeout(r, 3000));

  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', signUpData.user!.id)
    .single();
    
  const workspaceId = workspaceMembers?.workspace_id;
  if (!workspaceId) {
    console.error('No workspace found');
    return;
  }

  console.log('2. A. Verifying new workspace receives default free plan...');
  const sub = await billingService.getWorkspaceSubscription(workspaceId);
  console.log('Subscription:', sub);
  if (sub.plan !== 'FREE') {
    console.error('Expected FREE plan, got', sub.plan);
  }

  const limits = await billingService.getPlanLimits(sub.plan);
  console.log('Limits:', limits);
  if (limits.contractors !== 5) {
    console.error('Expected FREE contractor limit to be 5');
  }

  console.log('3. C & D. Testing Contractor Limits...');
  let createdCount = 0;
  let blocked = false;

  for (let i = 0; i < 7; i++) {
    const res = await contractorService.createContractor(workspaceId, {
      companyName: `Test Company ${i}`,
      trade: 'Test Trade',
      primaryContact: 'Test Contact',
      email: `test${i}@gmail.com`
    });

    if (res.error) {
      if (res.error.includes('LIMIT_REACHED')) {
        console.log(`Contractor ${i + 1} blocked by limit correctly.`);
        blocked = true;
      } else {
        console.error('Unexpected error:', res.error);
      }
    } else {
      createdCount++;
      console.log(`Contractor ${i + 1} created successfully.`);
    }
  }

  console.log(`Created ${createdCount} contractors.`);
  if (createdCount !== 5 || !blocked) {
    console.error('Contractor limit not enforced properly');
  }

  console.log('4. I. Verifying usage is calculated from real records...');
  const usage = await billingService.getWorkspaceUsage(workspaceId);
  console.log('Usage report:', JSON.stringify(usage, null, 2));

  if (usage.contractors.current !== 5) {
    console.error('Usage calculation incorrect');
  }

  console.log('--- TESTS COMPLETE ---');
  process.exit(0);
}

runTests();
