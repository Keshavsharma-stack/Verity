import { processWorkspaceExpirationScan } from '../../src/server/notificationLogic.js';
import { getSupabaseUserClient } from '../../src/server/notificationLogic.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    let supabase;
    try {
      supabase = getSupabaseUserClient(authHeader);
    } catch (e: any) {
      return res.status(401).json({ error: 'Unauthorized: ' + e.message });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }
    const userId = userData.user.id;

    // Get the workspace
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (wsError || !workspaces || workspaces.length === 0) {
      return res.status(400).json({ error: 'No workspace found for user' });
    }
    const workspaceId = workspaces[0].id;
    
    // Check cleanup mode
    if (req.query.cleanup === 'true') {
      const { data: delContractor } = await supabase.from('contractors').select('id').eq('workspace_id', workspaceId).eq('company_name', '[TEST MODE] CRITICAL CONTRACTOR').single();
      if (delContractor) {
        await supabase.from('documents').delete().eq('contractor_id', delContractor.id);
        await supabase.from('contractors').delete().eq('id', delContractor.id);
      }
      return res.status(200).json({ success: true, message: 'Test data cleaned up successfully' });
    }

    // 1. Create Test Contractor
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .insert({
        workspace_id: workspaceId,
        company_name: '[TEST MODE] CRITICAL CONTRACTOR',
        contact_email: 'test@example.com'
      })
      .select()
      .single();

    if (contractorError) {
      return res.status(500).json({ error: 'Failed to create test contractor', details: contractorError });
    }

    // 2. Create Test Document expiring in exactly 7 days
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);
    const expiresAt = targetDate.toISOString().split('T')[0];

    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        contractor_id: contractor.id,
        name: '[TEST MODE] CRITICAL POLICY',
        status: 'VERIFIED',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (docError) {
      return res.status(500).json({ error: 'Failed to create test document', details: docError });
    }

    // 3. Run Scan 1
    const scan1 = await processWorkspaceExpirationScan(supabase, workspaceId, 'http://localhost');

    // 4. Run Scan 2 (Idempotency)
    const scan2 = await processWorkspaceExpirationScan(supabase, workspaceId, 'http://localhost');

    // 5. Fetch Notification
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('document_id', document.id);

    return res.status(200).json({
      success: true,
      workspaceId,
      documentId: document.id,
      expiresAt,
      scan1,
      scan2,
      notificationsGenerated: notifications?.length || 0,
      notificationData: notifications && notifications.length > 0 ? notifications[0] : null
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
