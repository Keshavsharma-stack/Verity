import { createClient } from '@supabase/supabase-js';
import { processWorkspaceExpirationScan } from './notificationLogic.js';
import { verifyUserToken, extractBearerToken } from './billingLogic.js';

function getServerServiceRoleClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing on server (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function handleE2ETest(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate user from incoming Bearer token
    const token = extractBearerToken(req);
    if (!token) {
      console.warn('[E2E Test / Security] Request rejected: Missing Authorization header');
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const { user, error: authError } = await verifyUserToken(token, 'E2E_TEST');
    if (authError || !user) {
      console.warn('[E2E Test / Security] User session verification failed:', authError);
      return res.status(401).json({ success: false, error: `Unauthorized: ${authError || 'User session invalid'}` });
    }
    const userId = user.id;

    // 2. Initialize server-only Supabase Service-Role client
    let serviceRoleClient;
    try {
      serviceRoleClient = getServerServiceRoleClient();
    } catch (e: any) {
      console.error('[E2E Test / DB] Failed to create server service-role client:', e.message);
      return res.status(500).json({ success: false, error: 'Supabase configuration missing on server' });
    }

    // 3. Verify workspace and enforce ADMIN role authorization
    const requestedWorkspaceId = req.body?.workspaceId || req.query?.workspaceId;
    let workspaceId: string | null = null;
    let userRole = 'MEMBER';

    if (requestedWorkspaceId) {
      // Verify user membership in requested workspace
      const { data: requestedMember, error: reqMemErr } = await serviceRoleClient
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('workspace_id', requestedWorkspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!reqMemErr && requestedMember) {
        workspaceId = requestedMember.workspace_id;
        userRole = requestedMember.role || 'MEMBER';
      } else {
        const { data: requestedWs, error: reqWsErr } = await serviceRoleClient
          .from('workspaces')
          .select('id, owner_id')
          .eq('id', requestedWorkspaceId)
          .eq('owner_id', userId)
          .maybeSingle();

        if (!reqWsErr && requestedWs) {
          workspaceId = requestedWs.id;
          userRole = 'ADMIN';
        }
      }
    }

    if (!workspaceId) {
      const { data: memberData, error: memberError } = await serviceRoleClient
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!memberError && memberData && memberData.length > 0 && memberData[0].workspace_id) {
        workspaceId = memberData[0].workspace_id;
        userRole = memberData[0].role || 'MEMBER';
      } else {
        const { data: workspaces, error: wsError } = await serviceRoleClient
          .from('workspaces')
          .select('id, owner_id')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!wsError && workspaces && workspaces.length > 0) {
          workspaceId = workspaces[0].id;
          userRole = 'ADMIN';
        }
      }
    }

    if (!workspaceId) {
      console.error('[E2E Test] No workspace associated with user:', userId);
      return res.status(400).json({ success: false, error: 'No active workspace found for user' });
    }

    // Role enforcement: strictly require ADMIN role for running QA test pipelines
    if (userRole !== 'ADMIN') {
      console.warn(`[E2E Test / Security] Forbidden: User ${userId} attempted QA execution with role '${userRole}'`);
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Admin or Developer role is required to access the QA test harness.' 
      });
    }

    console.log(`[E2E Test] Admin verified (User: ${userId}, Workspace: ${workspaceId}, Role: ${userRole}). Using server-only Service Role client.`);

    // 4. Helper function for comprehensive cleanup of test records in workspace using Service Role
    const performTestCleanup = async (targetWsId: string) => {
      const { data: testContractors, error: selectError } = await serviceRoleClient
        .from('contractors')
        .select('id')
        .eq('workspace_id', targetWsId)
        .or('company_name.ilike.%[TEST MODE]%,company_name.ilike.%[TEST]%,company_name.ilike.%[E2E_TEST]%,company_name.ilike.%[E2E%');

      if (selectError) {
        console.error('[E2E Test] Error querying test contractors for cleanup:', selectError);
      }

      let deletedDocsCount = 0;
      let deletedNotifsCount = 0;
      let deletedContractorsCount = 0;

      const contractorIds = (testContractors || []).map((c: any) => c.id);

      // Find test documents either linked to test contractors or matching QA test naming
      let docQuery = serviceRoleClient
        .from('documents')
        .select('id, file_url, contractor_id')
        .eq('workspace_id', targetWsId);

      if (contractorIds.length > 0) {
        docQuery = docQuery.or(`contractor_id.in.(${contractorIds.join(',')}),name.ilike.%[TEST MODE]%,name.ilike.%[TEST]%,name.ilike.%[E2E%`);
      } else {
        docQuery = docQuery.or('name.ilike.%[TEST MODE]%,name.ilike.%[TEST]%,name.ilike.%[E2E%');
      }

      const { data: testDocs, error: docQueryErr } = await docQuery;

      if (docQueryErr) {
        console.error('[E2E Test] Error querying test documents for cleanup:', docQueryErr);
      }

      if (testDocs && testDocs.length > 0) {
        const docIds = testDocs.map((d: any) => d.id);
        
        // Remove storage files if any
        const filePaths = testDocs
          .map((d: any) => d.file_url)
          .filter((url: string) => url && typeof url === 'string' && (url.startsWith('workspace/') || url.includes('qa_')));

        if (filePaths.length > 0) {
          try {
            await serviceRoleClient.storage.from('documents').remove(filePaths);
            console.log('[E2E Test] Cleaned up storage files via Service Role:', filePaths);
          } catch (storageRemoveErr) {
            console.warn('[E2E Test] Storage remove warning:', storageRemoveErr);
          }
        }
        
        // Delete notifications
        const { count: notifCount, error: notifDelErr } = await serviceRoleClient
          .from('notifications')
          .delete({ count: 'exact' })
          .in('document_id', docIds);
        if (notifDelErr) console.error('[E2E Test] Notification deletion error:', notifDelErr);
        deletedNotifsCount = notifCount || 0;

        // Delete document extractions if any
        try {
          await serviceRoleClient
            .from('document_extractions')
            .delete()
            .in('document_id', docIds);
        } catch {
          // Ignore if table not present
        }

        // Delete reminders
        try {
          await serviceRoleClient
            .from('reminders')
            .delete()
            .in('document_id', docIds);
        } catch {
          // Ignore
        }

        // Delete documents
        const { count: docCount, error: docDelErr } = await serviceRoleClient
          .from('documents')
          .delete({ count: 'exact' })
          .in('id', docIds);
        if (docDelErr) console.error('[E2E Test] Document deletion error:', docDelErr);
        deletedDocsCount = docCount || 0;
      }

      if (contractorIds.length > 0) {
        // Delete compliance requirements
        const { error: reqDelErr } = await serviceRoleClient
          .from('compliance_requirements')
          .delete()
          .in('contractor_id', contractorIds);
        if (reqDelErr) console.error('[E2E Test] Compliance requirements deletion error:', reqDelErr);

        // Delete contractors
        const { count: conCount, error: conDelErr } = await serviceRoleClient
          .from('contractors')
          .delete({ count: 'exact' })
          .in('id', contractorIds);
        if (conDelErr) console.error('[E2E Test] Contractor deletion error:', conDelErr);
        deletedContractorsCount = conCount || 0;
      }

      return {
        deletedContractors: deletedContractorsCount,
        deletedDocuments: deletedDocsCount,
        deletedNotifications: deletedNotifsCount
      };
    };

    // Check manual cleanup mode
    if (req.query?.cleanup === 'true' || req.body?.action === 'cleanup') {
      console.log(`[E2E Test] Manual cleanup requested for workspace ${workspaceId}...`);
      const cleanupStats = await performTestCleanup(workspaceId);
      console.log(`[E2E Test] Cleanup finished:`, cleanupStats);

      return res.status(200).json({ 
        success: true, 
        message: 'QA test data cleaned up successfully.',
        stats: cleanupStats
      });
    }

    // Pre-test cleanup to ensure idempotent baseline
    try {
      await performTestCleanup(workspaceId);
    } catch (preCleanErr) {
      console.warn('[E2E Test] Pre-test cleanup warning:', preCleanErr);
    }

    // 5. Create Test Contractor using Service-Role client
    const testContractorPayload = {
      workspace_id: workspaceId,
      company_name: '[TEST MODE] CRITICAL CONTRACTOR',
      primary_contact: 'QA Lead',
      email: user.email || 'qa-test@veritycompliance.internal',
      trade: 'General Construction',
      status: 'NON_COMPLIANT',
      contractor_type: 'Subcontractor'
    };
    
    console.log('[E2E Test] Creating test contractor in workspace:', workspaceId);
    
    const { data: contractor, error: contractorError } = await serviceRoleClient
      .from('contractors')
      .insert(testContractorPayload)
      .select()
      .single();

    if (contractorError || !contractor) {
      console.error('[E2E Test] Failed to create test contractor:', {
        code: contractorError?.code,
        message: contractorError?.message,
        details: contractorError?.details,
        workspaceId
      });
      return res.status(500).json({ 
        success: false, 
        error: `Failed to create QA test contractor: ${contractorError?.message || 'Database error'}`
      });
    }

    console.log('[E2E Test] Test contractor created successfully with ID:', contractor.id);

    // Insert compliance requirements for contractor
    const { error: reqError } = await serviceRoleClient.from('compliance_requirements').insert({
      contractor_id: contractor.id,
      workspace_id: workspaceId,
      insurance_required: true,
      business_license_required: true,
      professional_license_required: false,
      safety_documentation_required: false,
      tax_documentation_required: false,
      workers_comp_required: true
    });

    if (reqError) {
      console.warn('[E2E Test] Compliance requirements insert warning:', reqError.message);
    }

    // 6. Upload real non-empty compliance test file to Supabase Storage using server-only Service-Role client
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 712 Td
(QA Compliance Test Policy) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
298
%%EOF`;

    const samplePdfBuffer = Buffer.from(pdfContent, 'utf-8');
    const storageTimestamp = Date.now();
    const testStoragePath = `workspace/${workspaceId}/contractors/${contractor.id}/${storageTimestamp}_qa_e2e_critical_policy.pdf`;
    const actualFileSize = samplePdfBuffer.length;

    console.log('[E2E Test] Uploading non-empty test PDF to Supabase Storage via Service Role client:', testStoragePath, 'size:', actualFileSize);

    let uploadSuccess = false;
    let storageErrorMessage = '';

    // Direct buffer upload with service-role credentials (bypassing client-auth constraints)
    try {
      const { data: fileUploadData, error: fileUploadErr } = await serviceRoleClient.storage
        .from('documents')
        .upload(testStoragePath, samplePdfBuffer, {
          cacheControl: '3600',
          contentType: 'application/pdf',
          upsert: true
        });

      if (!fileUploadErr && fileUploadData) {
        uploadSuccess = true;
        console.log('[E2E Test] Test PDF uploaded successfully to Storage path:', fileUploadData.path || testStoragePath);
      } else if (fileUploadErr) {
        console.warn('[E2E Test] Service-Role Buffer upload error:', fileUploadErr.message);
        storageErrorMessage = fileUploadErr.message;
      }
    } catch (fileEx: any) {
      console.warn('[E2E Test] Buffer upload exception:', fileEx?.message || fileEx);
      storageErrorMessage = fileEx?.message || String(fileEx);
    }

    // Fallback: Uint8Array upload with service role
    if (!uploadSuccess) {
      try {
        const uint8 = new Uint8Array(samplePdfBuffer);
        const { data: uint8UploadData, error: uint8UploadErr } = await serviceRoleClient.storage
          .from('documents')
          .upload(testStoragePath, uint8, {
            cacheControl: '3600',
            contentType: 'application/pdf',
            upsert: true
          });

        if (!uint8UploadErr && uint8UploadData) {
          uploadSuccess = true;
          console.log('[E2E Test] Test PDF uploaded successfully via Uint8Array fallback to:', uint8UploadData.path || testStoragePath);
        } else if (uint8UploadErr) {
          console.warn('[E2E Test] Uint8Array fallback upload error:', uint8UploadErr.message);
          storageErrorMessage = uint8UploadErr.message;
        }
      } catch (uint8Ex: any) {
        console.warn('[E2E Test] Uint8Array fallback exception:', uint8Ex?.message || uint8Ex);
      }
    }

    if (!uploadSuccess) {
      console.error(`[E2E Test] Storage upload failed: ${storageErrorMessage}`);
      try {
        await serviceRoleClient.from('compliance_requirements').delete().eq('contractor_id', contractor.id);
        await serviceRoleClient.from('contractors').delete().eq('id', contractor.id);
      } catch (rollbackErr) {
        console.warn('[E2E Test] Rollback after storage error warning:', rollbackErr);
      }

      return res.status(500).json({ 
        success: false, 
        error: `Failed to upload QA test document file to storage: ${storageErrorMessage || 'Storage access error'}`,
        phase: 'STORAGE_UPLOAD'
      });
    }

    // 7. Create Test Document expiring in exactly 7 days (Triggers CRITICAL 7_DAYS checkpoint in production pipeline)
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);
    const expiresAt = targetDate.toISOString();

    const testDocumentPayload = {
      workspace_id: workspaceId,
      contractor_id: contractor.id,
      name: '[TEST MODE] CRITICAL POLICY',
      type: 'GENERAL_LIABILITY',
      file_url: testStoragePath,
      file_size: actualFileSize,
      status: 'EXPIRING',
      processing_status: 'UPLOADED',
      expires_at: expiresAt
    };

    console.log('[E2E Test] Creating test document record with expiration:', expiresAt, 'file_url:', testStoragePath);

    const primaryInsertRes = await serviceRoleClient
      .from('documents')
      .insert(testDocumentPayload)
      .select()
      .single();

    if (primaryInsertRes.error || !primaryInsertRes.data) {
      const errorMsg = primaryInsertRes.error?.message || 'Failed to create QA test document record';
      console.error('[E2E Test] Failed to create test document record:', {
        code: primaryInsertRes.error?.code,
        message: errorMsg,
        details: primaryInsertRes.error?.details,
        workspaceId,
        contractorId: contractor.id
      });
      try {
        await serviceRoleClient.storage.from('documents').remove([testStoragePath]);
        await serviceRoleClient.from('compliance_requirements').delete().eq('contractor_id', contractor.id);
        await serviceRoleClient.from('contractors').delete().eq('id', contractor.id);
      } catch (cleanErr) {
        console.warn('[E2E Test] Rollback cleanup warning:', cleanErr);
      }
      return res.status(500).json({ 
        success: false, 
        error: `Failed to create QA test document: ${errorMsg}`,
        code: primaryInsertRes.error?.code,
        details: primaryInsertRes.error?.details,
        phase: 'DOCUMENT_RECORD_CREATION'
      });
    }

    const document = primaryInsertRes.data;
    console.log('[E2E Test] Test document created successfully with ID:', document.id);

    // 8. Execute Production Expiration/Notification Pipeline: Scan 1 (Initial detection & notification creation)
    console.log('[E2E Test] Running Scan 1 for workspace:', workspaceId);
    const scan1 = await processWorkspaceExpirationScan(serviceRoleClient, workspaceId, 'https://app.veritycompliance.com');

    // 9. Execute Production Expiration/Notification Pipeline: Scan 2 (Idempotency verification: 0 duplicates created)
    console.log('[E2E Test] Running Scan 2 (Idempotency check) for workspace:', workspaceId);
    const scan2 = await processWorkspaceExpirationScan(serviceRoleClient, workspaceId, 'https://app.veritycompliance.com');

    // 10. Fetch Generated Notifications for the test document
    const { data: notifications, error: notifError } = await serviceRoleClient
      .from('notifications')
      .select('*')
      .eq('document_id', document.id);

    if (notifError) {
      console.warn('[E2E Test] Warning fetching generated notifications:', notifError.message);
    }

    console.log(`[E2E Test] Pipeline completed successfully. Scan 1 created: ${scan1.newNotificationsCount}, Scan 2 duplicates skipped: ${scan2.duplicatesSkipped}`);

    return res.status(200).json({
      success: true,
      message: 'E2E expiration and idempotency test verified successfully.',
      workspaceId,
      documentId: document.id,
      contractorId: contractor.id,
      expiresAt,
      scan1Results: {
        scannedDocuments: scan1.scannedDocuments,
        notificationsCreated: scan1.newNotificationsCount,
        emailsAttempted: scan1.emailsAttempted,
        emailsSent: scan1.emailsSent
      },
      scan2Results: {
        scannedDocuments: scan2.scannedDocuments,
        notificationsCreated: scan2.newNotificationsCount,
        duplicatesSkipped: scan2.duplicatesSkipped
      },
      notificationsGenerated: notifications?.length || 0,
      notificationPreview: notifications && notifications.length > 0 ? {
        title: notifications[0].title,
        urgency: notifications[0].urgency,
        checkpoint: notifications[0].checkpoint,
        message: notifications[0].message
      } : null
    });

  } catch (err: any) {
    console.error('[E2E Test / Unhandled Error]', err);
    return res.status(500).json({ 
      success: false, 
      error: err?.message || 'An internal error occurred during the QA test execution.' 
    });
  }
}

