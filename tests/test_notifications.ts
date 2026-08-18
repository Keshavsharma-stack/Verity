import { supabase } from '../src/lib/supabase';
import { reminderService } from '../src/services/reminderService';
import fetch from 'node-fetch'; // if we want to call our own endpoint

async function runTests() {
  console.log('--- STARTING REMINDER ENGINE TESTS ---');

  // We need to test through the backend context OR directly via Supabase.
  // We'll log in as a test user, create a workspace, contractor, and documents.

  const email = `test-notification-${Date.now()}@gmail.com`;
  const password = 'testpassword123';

  console.log('1. Signing up test user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Notification Tester', company_name: 'Test Corp' }
    }
  });

  if (signUpError) {
    console.error('Sign up failed', signUpError);
    return;
  }

  // Wait for triggers to create workspace
  await new Promise(r => setTimeout(r, 2000));

  // Get session token to call API
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  
  if (!token) {
    console.error('No session token');
    return;
  }

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

  console.log('2. Creating contractor...');
  const { data: contractor } = await supabase.from('contractors').insert({
    workspace_id: workspaceId,
    company_name: 'Notification Target LLC',
    primary_contact: 'Notify Me',
    email: 'devnull@example.com',
    trade: 'General'
  }).select().single();

  const contractorId = contractor.id;

  const now = new Date();
  const docConfigs = [
    { name: 'Exp 30 Days', days: 30, type: 'GENERAL_LIABILITY' },
    { name: 'Exp 15 Days', days: 15, type: 'WORKERS_COMPENSATION' },
    { name: 'Exp 7 Days', days: 7, type: 'GENERAL_LIABILITY' },
    { name: 'Exp 1 Day', days: 1, type: 'GENERAL_LIABILITY' },
    { name: 'Exp Today', days: 0, type: 'GENERAL_LIABILITY' },
    { name: 'Expired', days: -5, type: 'GENERAL_LIABILITY' },
    { name: 'No Expiration', days: null, type: 'W9' },
  ];

  console.log('3. Inserting documents...');
  for (const c of docConfigs) {
    const expiresAt = c.days !== null ? new Date(now.getTime() + c.days * 24 * 60 * 60 * 1000).toISOString() : null;
    await supabase.from('documents').insert({
      workspace_id: workspaceId,
      contractor_id: contractorId,
      name: c.name,
      type: c.type,
      file_url: 'http://test.com/doc.pdf',
      status: expiresAt && new Date(expiresAt) < now ? 'EXPIRED' : 'VALID',
      expires_at: expiresAt
    });
  }

  console.log('4. Syncing workspace reminders (H. Duplicate reminder generation)...');
  const sync1 = await reminderService.syncWorkspaceReminders(workspaceId);
  console.log(`First sync created: ${sync1.totalProcessed}`);
  
  const sync2 = await reminderService.syncWorkspaceReminders(workspaceId);
  console.log(`Second sync (idempotency check) created/processed: ${sync2.totalProcessed}`);
  // Expected: Should be handled by ON CONFLICT DO NOTHING

  console.log('5. Listing scheduled reminders...');
  const { data: remData } = await reminderService.listReminders(workspaceId);
  console.log(`Found ${remData.length} scheduled reminders.`);

  console.log('6. Processing Reminder Queue API (I. Failed Email Delivery - if no provider)...');
  // Call API explicitly with fetch
  const processRes = await fetch('http://localhost:3000/api/reminders/process-queue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ workspaceId })
  });
  
  const processJson = await processRes.json();
  console.log('Process Queue Response:', processJson);
  
  console.log('7. Triggering manual renewal notification API...');
  const testDoc = remData.find(r => !!r.documentId);
  if (testDoc) {
    const manualRes = await fetch('http://localhost:3000/api/reminders/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        workspaceId, 
        contractorId, 
        documentId: testDoc.documentId,
        customMessage: 'Please upload this specific doc ASAP!'
      })
    });
    const manualJson = await manualRes.json();
    console.log('Manual Notification Response:', manualJson);
  }

  console.log('8. Checking Audit Activities...');
  const { data: activities } = await supabase.from('activities').select('*').eq('workspace_id', workspaceId).like('action', 'NOTIFICATION_%');
  console.log(`Found ${activities?.length || 0} notification activities:`, activities?.map(a => a.description));

  console.log('9. Cross Workspace Security (K. Cross-workspace access attempt)');
  const fakeToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.x'; // Invalid token
  const crossRes = await fetch('http://localhost:3000/api/reminders/process-queue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': fakeToken
    },
    body: JSON.stringify({ workspaceId })
  });
  console.log('Cross workspace/Invalid token Response status:', crossRes.status);
  
  console.log('--- TESTS COMPLETE ---');
  process.exit(0);
}

runTests();
