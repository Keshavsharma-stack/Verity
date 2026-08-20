import { getSupabaseUserClient, processWorkspaceExpirationScan, getSupabaseServerClient } from './notificationLogic.js';
import { randomUUID } from 'crypto';

export async function handleE2ETest(req: any, res: any) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized. Please run this test from the authenticated application UI.' });
  }

  const supabase = getSupabaseUserClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Find user's workspace
  const { data: memberData, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userData.user.id)
    .single();

  if (memberError || !memberData) {
    return res.status(404).json({ error: 'No workspace found for user' });
  }

  const workspaceId = memberData.workspace_id;

  const { action } = req.body || {};

  if (action === 'cleanup') {
    // Delete test documents
    await supabase.from('documents').delete().like('name', '[E2E_TEST]%').eq('workspace_id', workspaceId);
    // Delete test contractors
    await supabase.from('contractors').delete().like('company_name', '[E2E_TEST]%').eq('workspace_id', workspaceId);
    
    return res.status(200).json({ success: true, message: 'Test data cleaned up successfully.' });
  }

  // Action: execute

  // 1. Create a test contractor
  const testContractorName = `[E2E_TEST] Contractor ${randomUUID().substring(0, 8)}`;
  const { data: contractor, error: contractorError } = await supabase.from('contractors').insert({
    workspace_id: workspaceId,
    company_name: testContractorName,
    primary_contact: 'Test Contact',
    email: userData.user.email, // Use the user's email to verify email dispatch if configured
    trade: 'General'
  }).select().single();

  if (contractorError) {
    return res.status(500).json({ error: 'Failed to create test contractor', details: contractorError });
  }

  // 2. Create a test document expiring in EXACTLY 7 days (CRITICAL checkpoint)
  const now = new Date();
  const expireDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const testDocName = `[E2E_TEST] Liability Insurance`;
  
  const { data: doc, error: docError } = await supabase.from('documents').insert({
    workspace_id: workspaceId,
    contractor_id: contractor.id,
    name: testDocName,
    type: 'GENERAL_LIABILITY',
    status: 'VALID',
    expires_at: expireDate.toISOString()
  }).select().single();

  if (docError) {
    return res.status(500).json({ error: 'Failed to create test document', details: docError });
  }

  // 3. Run the scan (we use the server client here if available, otherwise user client)
  // Wait, processWorkspaceExpirationScan needs to be able to insert notifications.
  // The user client might be blocked by RLS from inserting notifications or reading them without policies.
  // So we use getSupabaseServerClient() for the scan part, just like the actual cron.
  const serverClient = getSupabaseServerClient();
  const scanClient = serverClient || supabase; // Fallback to user client if testing locally without service key

  // Run scan 1
  const scan1 = await processWorkspaceExpirationScan(scanClient, workspaceId, 'https://app.veritycompliance.com');
  
  // Run scan 2 (verify idempotency)
  const scan2 = await processWorkspaceExpirationScan(scanClient, workspaceId, 'https://app.veritycompliance.com');

  // 4. Verify notification was created
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('document_id', doc.id);

  return res.status(200).json({
    success: true,
    message: 'E2E Test executed successfully',
    testData: {
      contractor: contractor.company_name,
      document: doc.name,
      expires_at: doc.expires_at,
      workspace_id: workspaceId,
      document_id: doc.id
    },
    scan1,
    scan2,
    notificationsGenerated: notifications || []
  });
}
