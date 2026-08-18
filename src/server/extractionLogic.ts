import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Helper for Supabase user client
export function getSupabaseUserClient(authHeader?: string) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Handle AI Document Extraction Pipeline
 */
export async function handleProcessExtraction(req: any, res: any) {
  const reqId = randomUUID();
  console.log(`[handleProcessExtraction] Started reqId=${reqId}`);
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { workspaceId, contractorId, documentId } = req.body || {};
    if (!workspaceId || !contractorId || !documentId) {
      return res.status(400).json({ error: 'Missing required parameters: workspaceId, contractorId, documentId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    // 1. Authenticate user
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    // 2. Verify workspace membership (Authorization isolation)
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberData) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    // 3. Verify contractor belongs to this workspace
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, company_name')
      .eq('id', contractorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (contractorError || !contractorData) {
      return res.status(404).json({ error: 'Contractor not found in workspace' });
    }

    // 4. Verify document belongs to contractor and workspace
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('contractor_id', contractorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (docError || !docData) {
      return res.status(404).json({ error: 'Document not found in workspace' });
    }

    // 4.5 ENFORCE AI LIMITS (Server-Side SaaS Usage Check)
    const { count: aiCount } = await supabase
      .from('document_extractions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
      
    const planSlug = subData?.plan || 'FREE';
    let aiLimit = 10;
    if (planSlug === 'STARTER') aiLimit = 50;
    else if (planSlug === 'PRO') aiLimit = 250;
    else if (planSlug === 'BUSINESS') aiLimit = 999999;

    if (aiCount !== null && aiCount >= aiLimit) {
      // Mark document as FAILED due to limits
      await supabase
        .from('documents')
        .update({
          processing_status: 'FAILED',
          processing_error: 'LIMIT_REACHED: Maximum AI extractions exceeded for current plan.',
          processed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return res.status(402).json({
        error: 'LIMIT_REACHED: Maximum AI extractions exceeded for current plan.',
        processingStatus: 'FAILED',
      });
    }

    // 5. Check if GEMINI_API_KEY is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Set status to FAILED with explicit configuration notice
      await supabase
        .from('documents')
        .update({
          processing_status: 'FAILED',
          processing_error: 'AI provider credentials/configuration required. Please set GEMINI_API_KEY.',
          processed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return res.status(503).json({
        error: 'AI provider credentials/configuration required.',
        processingStatus: 'FAILED',
      });
    }

    // Set document status to PROCESSING
    await supabase
      .from('documents')
      .update({
        processing_status: 'PROCESSING',
        processing_error: null,
      })
      .eq('id', documentId);

    // 6. Fetch Document File or signed URL from Supabase Storage
    let fileBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';
    
    if (docData.file_url && docData.file_url.startsWith('workspace/')) {
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(docData.file_url);

      if (!downloadError && downloadData) {
        const arrayBuf = await downloadData.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        mimeType = downloadData.type || 'application/pdf';
      }
    }

    // 7. Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey });
    const extractionPrompt = `You are Verity's enterprise compliance document analysis and OCR engine.
Analyze this contractor compliance document thoroughly for the company "${contractorData.company_name}".

Extract all relevant fields with evidence and confidence scores.
Return ONLY a valid JSON object matching this exact structure:
{
  "documentTypeDetected": "CERTIFICATE_OF_INSURANCE" | "WORKERS_COMPENSATION" | "BUSINESS_LICENSE" | "PROFESSIONAL_LICENSE" | "W9" | "SAFETY_CERTIFICATE" | "OTHER" | "UNKNOWN",
  "entityName": { "value": string or null, "confidence": number (0.0 to 1.0), "evidenceText": string or null },
  "documentNumber": { "value": string or null, "confidence": number, "evidenceText": string or null },
  "policyNumber": { "value": string or null, "confidence": number, "evidenceText": string or null },
  "carrierName": { "value": string or null, "confidence": number, "evidenceText": string or null },
  "effectiveDate": { "value": "YYYY-MM-DD" or null, "confidence": number, "evidenceText": string or null },
  "expirationDate": { "value": "YYYY-MM-DD" or null, "confidence": number, "evidenceText": string or null },
  "coverageLimit": { "value": number (e.g. 1000000) or null, "confidence": number, "evidenceText": string or null },
  "additionalInsured": { "value": boolean or null, "confidence": number, "evidenceText": string or null },
  "waiverOfSubrogation": { "value": boolean or null, "confidence": number, "evidenceText": string or null },
  "licenseNumber": { "value": string or null, "confidence": number, "evidenceText": string or null },
  "licenseState": { "value": string or null, "confidence": number, "evidenceText": string or null },
  "overallConfidence": number (0.0 to 1.0),
  "reviewRecommended": boolean,
  "reviewReason": string or null
}

Rules:
1. Never fabricate or guess values. If a field is not present or illegible, set value to null.
2. Standardize dates to YYYY-MM-DD calendar format.
3. If document appears to be a COI, extract each policy limit accurately.
4. If entityName differs from "${contractorData.company_name}", flag reviewRecommended=true with reviewReason.`;

    const parts: any[] = [];
    if (fileBuffer && fileBuffer.length > 0) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBuffer.toString('base64'),
        },
      });
    }
    parts.push({ text: extractionPrompt });

    // Call Gemini 3.7 Flash for structured OCR extraction with retry for transient spikes
    let responseText = '{}';
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: parts,
          config: {
            responseMimeType: 'application/json',
          },
        });
        responseText = response.text || '{}';
        lastError = null;
        break;
      } catch (err: any) {
    console.error(`Error reqId=${reqId}:`, err);
        lastError = err;
        if (attempt < 3 && (err?.status === 503 || err?.status === 429)) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
    }

    if (lastError && !responseText) {
      throw lastError;
    }

    let extractedJson: any = {};
    try {
      extractedJson = JSON.parse(responseText);
    } catch {
      throw new Error('AI returned invalid JSON structure');
    }

    // 8. Normalize & Validate Extracted Fields
    const normalizedData: any = {
      documentType: extractedJson.documentTypeDetected ? { value: extractedJson.documentTypeDetected, confidence: extractedJson.overallConfidence } : undefined,
      documentNumber: extractedJson.documentNumber || undefined,
      entityName: extractedJson.entityName || undefined,
      policyNumber: extractedJson.policyNumber || undefined,
      effectiveDate: extractedJson.effectiveDate || undefined,
      expirationDate: extractedJson.expirationDate || undefined,
      carrierName: extractedJson.carrierName || undefined,
      coverageLimit: extractedJson.coverageLimit || undefined,
      additionalInsured: extractedJson.additionalInsured || undefined,
      waiverOfSubrogation: extractedJson.waiverOfSubrogation || undefined,
      licenseNumber: extractedJson.licenseNumber || undefined,
      licenseState: extractedJson.licenseState || undefined,
    };

    // 9. Requirement Matching Engine
    const requirementChecks: any[] = [];
    const reviewReasons: string[] = [];
    let isReviewRequired = extractedJson.reviewRecommended || false;

    if (extractedJson.reviewReason) {
      reviewReasons.push(extractedJson.reviewReason);
    }

    // Check Expiration Date
    const extractedExpDate = extractedJson.expirationDate?.value;
    if (extractedExpDate) {
      const targetTime = new Date(extractedExpDate).getTime();
      if (!isNaN(targetTime)) {
        if (targetTime < Date.now()) {
          isReviewRequired = true;
          reviewReasons.push(`Extracted expiration date (${extractedExpDate}) is in the past.`);
        }
      }
    } else if (docData.type !== 'W9' && docData.type !== 'TAX_DOCUMENT') {
      isReviewRequired = true;
      reviewReasons.push('No verifiable expiration date detected on document.');
    }

    // Check Entity Name matching
    if (extractedJson.entityName?.value) {
      const extractedName = extractedJson.entityName.value.toLowerCase().replace(/[^a-z0-9]/g, '');
      const expectedName = contractorData.company_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!extractedName.includes(expectedName) && !expectedName.includes(extractedName)) {
        isReviewRequired = true;
        reviewReasons.push(`Entity name on document ("${extractedJson.entityName.value}") does not clearly match contractor ("${contractorData.company_name}").`);
      }
    }

    // Check Coverage Limits if General Liability
    if (docData.type === 'GENERAL_LIABILITY' || docData.type === 'CERTIFICATE_OF_INSURANCE') {
      const limit = extractedJson.coverageLimit?.value;
      if (typeof limit === 'number' && limit < 1000000) {
        isReviewRequired = true;
        reviewReasons.push(`Coverage limit ($${limit.toLocaleString()}) may be below standard $1,000,000 threshold.`);
        requirementChecks.push({
          requirementKey: 'insuranceRequired',
          requirementName: 'General Liability Coverage',
          required: true,
          satisfied: false,
          extractedValue: `$${limit.toLocaleString()}`,
          expectedThreshold: '$1,000,000',
          status: 'DEFICIENT',
          notes: 'Extracted coverage below required minimum',
        });
      } else {
        requirementChecks.push({
          requirementKey: 'insuranceRequired',
          requirementName: 'General Liability Coverage',
          required: true,
          satisfied: true,
          extractedValue: limit ? `$${limit.toLocaleString()}` : 'Policy Active',
          status: 'SATISFIED',
        });
      }
    }

    // Determine Final Processing Status
    const finalProcessingStatus = isReviewRequired ? 'REVIEW_REQUIRED' : 'EXTRACTED';
    const finalReviewReason = reviewReasons.length > 0 ? reviewReasons.join(' ') : null;

    // 10. Record Document Extraction Record (Audit Trail & Evidence)
    const { data: extractionRecord } = await supabase
      .from('document_extractions')
      .insert({
        workspace_id: workspaceId,
        contractor_id: contractorId,
        document_id: documentId,
        document_type_detected: extractedJson.documentTypeDetected || 'UNKNOWN',
        raw_extracted_json: extractedJson,
        normalized_data: normalizedData,
        evidence_data: {
          overallConfidence: extractedJson.overallConfidence || 0.9,
          reviewReason: finalReviewReason || '',
        },
        requirement_checks: requirementChecks,
        status: finalProcessingStatus,
        model_used: 'gemini-3.7-flash',
      })
      .select()
      .single();

    // 11. Update Documents Table
    const updatePayload: any = {
      processing_status: finalProcessingStatus,
      processing_error: null,
      processed_at: new Date().toISOString(),
      extracted_data: normalizedData,
      review_reason: finalReviewReason,
    };

    // Update expiration date if not already set or if explicitly verified
    if (extractedExpDate && !docData.expires_at) {
      updatePayload.expires_at = extractedExpDate;
    }

    const { data: updatedDoc } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', documentId)
      .select()
      .single();

    // 12. Log Audit Activity
    await supabase.from('activities').insert({
      workspace_id: workspaceId,
      contractor_id: contractorId,
      document_id: documentId,
      action: 'DOCUMENT_AI_PROCESSED',
      description: `AI Document Intelligence completed for ${docData.name}: ${finalProcessingStatus}${finalReviewReason ? ` (${finalReviewReason})` : ''}`,
    });

    return res.json({
      success: true,
      document: updatedDoc,
      extraction: extractionRecord,
      processingStatus: finalProcessingStatus,
    });
  } catch (error: any) {
    console.error(`[handleProcessExtraction] Error reqId=${reqId}:`, error);
    return res.status(500).json({
      error: 'Document intelligence processing failed',
      processingStatus: 'FAILED',
    });
  }
}

/**
 * Handle Manual Human Verification / Review Decision
 */
export async function handleManualVerification(req: any, res: any) {
  const reqId = randomUUID();
  console.log(`[handleManualVerification] Started reqId=${reqId}`);
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { workspaceId, contractorId, documentId, status, reviewReason } = req.body || {};
    if (!workspaceId || !documentId || !status) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const supabase = getSupabaseUserClient(authHeader);
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        processing_status: status, // 'VERIFIED' or 'REVIEW_REQUIRED' or 'FAILED'
        status: status === 'VERIFIED' ? 'VALID' : 'PENDING_REVIEW',
        verified_at: new Date().toISOString(),
        verified_by: userData.user.id,
        review_reason: reviewReason || null,
      })
      .eq('id', documentId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    await supabase.from('activities').insert({
      workspace_id: workspaceId,
      contractor_id: contractorId,
      document_id: documentId,
      user_id: userData.user.id,
      action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REVIEWED',
      description: `User manually ${status === 'VERIFIED' ? 'verified' : 'reviewed'} document: ${updatedDoc.name}`,
    });

    return res.json({ success: true, document: updatedDoc });
  } catch (err: any) {
    console.error(`Error reqId=${reqId}:`, err);
    return res.status(500).json({ error: 'Manual verification failed' });
  }
}

/**
 * Handle Health Check
 */
export function handleHealth(req: any, res: any) {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
