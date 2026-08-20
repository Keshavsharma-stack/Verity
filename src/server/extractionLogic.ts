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
      console.warn(`[handleProcessExtraction] reqId=${reqId} Missing or invalid authorization header`);
      return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    }

    const { workspaceId, contractorId, documentId } = req.body || {};
    console.log(`[handleProcessExtraction] reqId=${reqId} params: workspaceId=${workspaceId}, contractorId=${contractorId}, documentId=${documentId}`);

    if (!workspaceId || !contractorId || !documentId) {
      return res.status(400).json({ error: 'Missing required parameters: workspaceId, contractorId, documentId' });
    }

    const supabase = getSupabaseUserClient(authHeader);

    // 1. Authenticate user
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error(`[handleProcessExtraction] reqId=${reqId} Authentication failed:`, userError?.message);
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    // 2. Verify workspace membership or ownership (Authorization isolation)
    let isAuthorized = false;
    let userRole = 'VIEWER';
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberData) {
      isAuthorized = true;
      userRole = memberData.role || 'MEMBER';
    } else {
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('id, owner_id')
        .eq('id', workspaceId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (wsData) {
        isAuthorized = true;
        userRole = 'ADMIN';
      }
    }

    if (!isAuthorized) {
      console.warn(`[handleProcessExtraction] reqId=${reqId} Forbidden: user ${userId} not in workspace ${workspaceId}`);
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    if (userRole === 'VIEWER') {
      console.warn(`[handleProcessExtraction] reqId=${reqId} Forbidden: viewer write-denial for user ${userId}`);
      return res.status(403).json({ error: 'Forbidden: Write or executive access is denied for VIEWER role.' });
    }

    // 3. Verify contractor belongs to this workspace
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, company_name')
      .eq('id', contractorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (contractorError || !contractorData) {
      console.error(`[handleProcessExtraction] reqId=${reqId} Contractor ${contractorId} not found in workspace ${workspaceId}`);
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
      console.error(`[handleProcessExtraction] reqId=${reqId} Document ${documentId} not found in workspace ${workspaceId}`);
      return res.status(404).json({ error: 'Document not found in workspace' });
    }

    // 4.5. Server-Side SAAS Limit Verification (AI OCR Extractions)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const currentPlan = subscription?.plan || 'FREE';
    const subStatus = subscription?.status || 'active';
    const effectivePlan = (subStatus === 'active' || subStatus === 'trialing') ? currentPlan : 'FREE';

    // Fetch the limit for this plan slug
    const { data: entitlementPlan } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', effectivePlan)
      .maybeSingle();

    let limitValue: number | null = 10; // Fallback to 10 for Free
    if (entitlementPlan?.id) {
      const { data: entitlement } = await supabase
        .from('plan_entitlements')
        .select('limit_value')
        .eq('plan_id', entitlementPlan.id)
        .eq('feature', 'max_ai_extractions')
        .maybeSingle();
      if (entitlement) {
        limitValue = entitlement.limit_value;
      }
    }

    if (limitValue !== null) {
      const { count: currentExtractions } = await supabase
        .from('document_extractions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      const countVal = currentExtractions || 0;
      if (countVal >= limitValue) {
        console.warn(`[handleProcessExtraction] reqId=${reqId} AI extraction limit reached (${countVal}/${limitValue}) for workspaceId=${workspaceId}`);
        await supabase
          .from('documents')
          .update({
            processing_status: 'FAILED',
            processing_error: 'LIMIT_REACHED: Maximum AI extraction limit exceeded for current plan. Please upgrade your subscription.',
            processed_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        return res.status(403).json({
          error: 'LIMIT_REACHED: Maximum AI extraction limit exceeded for current plan. Please upgrade your subscription.',
          processingStatus: 'FAILED',
        });
      }
    }

    // Set document status to PROCESSING in database
    await supabase
      .from('documents')
      .update({
        processing_status: 'PROCESSING',
        processing_error: null,
      })
      .eq('id', documentId)
      .eq('workspace_id', workspaceId);

    // 5. Check if GEMINI_API_KEY is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(`[handleProcessExtraction] reqId=${reqId} GEMINI_API_KEY is missing`);
      await supabase
        .from('documents')
        .update({
          processing_status: 'FAILED',
          processing_error: 'AI provider credentials/configuration required. Please set GEMINI_API_KEY.',
          processed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return res.status(503).json({
        error: 'AI provider credentials/configuration required. Please set GEMINI_API_KEY.',
        processingStatus: 'FAILED',
      });
    }

    // 6. Fetch Document File from Supabase Storage or URL
    let fileBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';

    if (docData.file_url && docData.file_url.startsWith('workspace/')) {
      console.log(`[handleProcessExtraction] reqId=${reqId} Downloading file from storage path: ${docData.file_url}`);
      try {
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(docData.file_url);

        if (downloadError) {
          console.info(`[handleProcessExtraction] reqId=${reqId} Storage object not present (${docData.file_url}), proceeding with metadata-driven analysis.`);
        } else if (downloadData) {
          const arrayBuf = await downloadData.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
          mimeType = downloadData.type || 'application/pdf';
          console.log(`[handleProcessExtraction] reqId=${reqId} Downloaded file: ${fileBuffer.length} bytes, MIME: ${mimeType}`);
        }
      } catch (err) {
        console.info(`[handleProcessExtraction] reqId=${reqId} Storage download skipped:`, err);
      }
    } else if (docData.file_url && (docData.file_url.startsWith('http://') || docData.file_url.startsWith('https://'))) {
      try {
        const fetchRes = await fetch(docData.file_url);
        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
          mimeType = fetchRes.headers.get('content-type') || 'application/pdf';
        }
      } catch (err) {
        console.error(`[handleProcessExtraction] reqId=${reqId} Exception fetching file URL:`, err);
      }
    }

    // Fallback MIME detection from file extension / document name
    const lowerPath = (docData.file_url || '').toLowerCase();
    const lowerDocName = (docData.name || '').toLowerCase();
    if (lowerPath.endsWith('.pdf') || lowerDocName.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (lowerPath.endsWith('.png') || lowerDocName.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg') || lowerDocName.endsWith('.jpg') || lowerDocName.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (lowerPath.endsWith('.webp') || lowerDocName.endsWith('.webp')) {
      mimeType = 'image/webp';
    } else if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = 'application/pdf';
    }

    // 7. Initialize Gemini AI
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const extractionPrompt = `You are Verity's enterprise compliance document analysis and OCR engine.
Analyze this contractor compliance document thoroughly for the company "${contractorData.company_name}".

Extract all verifiable fields directly from the document.
Return ONLY a valid JSON object matching this exact structure:
{
  "documentTypeDetected": "CERTIFICATE_OF_INSURANCE" | "WORKERS_COMPENSATION" | "BUSINESS_LICENSE" | "PROFESSIONAL_LICENSE" | "W9" | "SAFETY_CERTIFICATE" | "AUTO_INSURANCE" | "OTHER" | "UNKNOWN",
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
1. Never invent or fabricate information. If a field is missing, illegible, or not present, set value to null.
2. Standardize dates to YYYY-MM-DD calendar format.
3. If entityName on document differs from "${contractorData.company_name}", flag reviewRecommended=true with reviewReason.
4. If expiration date is missing or illegible (and document is not W9), flag reviewRecommended=true.`;

    const parts: any[] = [];
    if (fileBuffer && fileBuffer.length > 0) {
      parts.push({
        inlineData: {
          mimeType,
          data: fileBuffer.toString('base64'),
        },
      });
    } else {
      parts.push({
        text: `[Metadata only: Document "${docData.name}", Type: ${docData.type}, Contractor: ${contractorData.company_name}]`,
      });
    }
    parts.push({ text: extractionPrompt });

    // Call Gemini with high-availability model cascade and fast failover
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let responseText = '';
    let lastError: any = null;
    let modelUsed = 'gemini-3.1-flash-lite';

    for (const modelName of candidateModels) {
      if (responseText) break;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[handleProcessExtraction] reqId=${reqId} Calling ${modelName} (attempt ${attempt})...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: parts,
            config: {
              responseMimeType: 'application/json',
            },
          });
          const text = response.text?.trim();
          if (text && (text.startsWith('{') || text.includes('{'))) {
            const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            responseText = cleanJson;
            modelUsed = modelName;
            lastError = null;
            console.log(`[handleProcessExtraction] reqId=${reqId} Gemini response received from ${modelName} (${responseText.length} chars)`);
            break;
          }
        } catch (err: any) {
          const status = err?.status || err?.code || (err?.error && err.error.code);
          const isHighDemand = status === 503 || status === 'UNAVAILABLE' || err?.message?.includes('high demand') || err?.message?.includes('503');
          
          if (isHighDemand) {
            console.info(`[handleProcessExtraction] reqId=${reqId} ${modelName} experiencing high demand (503). Fast-switching to next candidate model.`);
            lastError = err;
            // On high demand / 503, immediately try the next model rather than blocking
            break;
          } else {
            console.warn(`[handleProcessExtraction] reqId=${reqId} Gemini attempt error (${modelName} attempt ${attempt}):`, err?.message || err);
            lastError = err;
            if (attempt < 2 && (status === 429 || status === 500)) {
              await new Promise(r => setTimeout(r, 1000 * attempt));
            }
          }
        }
      }
    }

    let extractedJson: any = null;
    if (responseText) {
      try {
        extractedJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn(`[handleProcessExtraction] reqId=${reqId} Failed to parse AI response JSON:`, parseErr);
      }
    }

    // Graceful fallback if upstream AI model was temporarily unavailable
    if (!extractedJson) {
      console.warn(`[handleProcessExtraction] reqId=${reqId} All AI models busy/unavailable, applying graceful review requirement`);
      extractedJson = {
        documentTypeDetected: docData.type || 'UNKNOWN',
        entityName: { value: contractorData.company_name, confidence: 0.6, evidenceText: 'Contractor record' },
        documentNumber: { value: null, confidence: 0, evidenceText: null },
        policyNumber: { value: null, confidence: 0, evidenceText: null },
        carrierName: { value: null, confidence: 0, evidenceText: null },
        effectiveDate: { value: null, confidence: 0, evidenceText: null },
        expirationDate: { value: docData.expires_at || null, confidence: docData.expires_at ? 0.8 : 0, evidenceText: null },
        coverageLimit: { value: null, confidence: 0, evidenceText: null },
        additionalInsured: { value: null, confidence: 0, evidenceText: null },
        waiverOfSubrogation: { value: null, confidence: 0, evidenceText: null },
        licenseNumber: { value: null, confidence: 0, evidenceText: null },
        licenseState: { value: null, confidence: 0, evidenceText: null },
        overallConfidence: 0.6,
        reviewRecommended: true,
        reviewReason: 'Automated OCR service temporarily busy. Document queued for manual inspection.',
      };
      modelUsed = 'system-fallback';
    }

    // 8. Normalize & Validate Extracted Fields
    const normalizedData: any = {
      documentType: extractedJson.documentTypeDetected ? { value: extractedJson.documentTypeDetected, confidence: extractedJson.overallConfidence || 0.9 } : undefined,
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

    // 9. Two-Tier Deterministic Compliance Validation Engine
    const requirementChecks: any[] = [];
    const validationFailures: string[] = [];
    const validationSuccesses: string[] = [];

    // Rule 1: Extraction & Model Validity
    const hasBinaryFile = Boolean(fileBuffer && fileBuffer.length > 0);
    const isRealAIModel = modelUsed !== 'system-fallback';
    if (!hasBinaryFile) {
      validationFailures.push('No binary document file was attached for optical verification.');
    }
    if (!isRealAIModel) {
      validationFailures.push('Automated OCR service busy; requires manual optical verification.');
    }

    // Rule 2: Overall & Field Extraction Confidence (Threshold: >= 0.85)
    const overallConf = typeof extractedJson.overallConfidence === 'number' ? extractedJson.overallConfidence : 0.0;
    const CONFIDENCE_THRESHOLD = 0.85;
    if (overallConf < CONFIDENCE_THRESHOLD) {
      validationFailures.push(`OCR confidence score (${Math.round(overallConf * 100)}%) is below auto-verification threshold (${Math.round(CONFIDENCE_THRESHOLD * 100)}%).`);
    } else {
      validationSuccesses.push(`High OCR confidence score (${Math.round(overallConf * 100)}%)`);
    }

    // Rule 3: Document Type Classification Matching
    const detectedType = extractedJson.documentTypeDetected || 'UNKNOWN';
    const expectedType = docData.type;
    const isTypeMatch = (() => {
      if (detectedType === expectedType) return true;
      if (expectedType === 'GENERAL_LIABILITY' && (detectedType === 'CERTIFICATE_OF_INSURANCE' || detectedType === 'GENERAL_LIABILITY')) return true;
      if (expectedType === 'CERTIFICATE_OF_INSURANCE' && (detectedType === 'CERTIFICATE_OF_INSURANCE' || detectedType === 'GENERAL_LIABILITY')) return true;
      if (expectedType === 'WORKERS_COMPENSATION' && (detectedType === 'WORKERS_COMPENSATION' || detectedType === 'CERTIFICATE_OF_INSURANCE')) return true;
      if (expectedType === 'AUTO_INSURANCE' && (detectedType === 'AUTO_INSURANCE' || detectedType === 'CERTIFICATE_OF_INSURANCE')) return true;
      if ((expectedType === 'W9' || expectedType === 'TAX_DOCUMENT') && (detectedType === 'W9' || detectedType === 'TAX_DOCUMENT')) return true;
      if (expectedType === 'BUSINESS_LICENSE' && detectedType === 'BUSINESS_LICENSE') return true;
      if (expectedType === 'PROFESSIONAL_LICENSE' && detectedType === 'PROFESSIONAL_LICENSE') return true;
      if (expectedType === 'SAFETY_CERTIFICATE' && detectedType === 'SAFETY_CERTIFICATE') return true;
      return false;
    })();

    if (!isTypeMatch) {
      validationFailures.push(`Document category mismatch (detected "${detectedType.replace(/_/g, ' ')}" for category "${expectedType.replace(/_/g, ' ')}").`);
    } else {
      validationSuccesses.push(`Category verified: ${expectedType.replace(/_/g, ' ')}`);
    }

    // Rule 4: Entity Identity / Legal Name Matching
    const extractedEntityName = extractedJson.entityName?.value?.trim();
    let entityMatches = false;
    if (!extractedEntityName) {
      validationFailures.push('No verifiable contractor entity or company name detected on document.');
    } else {
      const normDocEntity = extractedEntityName.toLowerCase().replace(/\b(llc|inc|corp|co|incorporated|company|ltd|limited|d\/b\/a|dba|enterprises|group|services|contracting|construction)\b/gi, '').replace(/[^a-z0-9]/g, '').trim();
      const normContractor = contractorData.company_name.toLowerCase().replace(/\b(llc|inc|corp|co|incorporated|company|ltd|limited|d\/b\/a|dba|enterprises|group|services|contracting|construction)\b/gi, '').replace(/[^a-z0-9]/g, '').trim();
      
      entityMatches = Boolean(normDocEntity && normContractor && (
        normDocEntity === normContractor ||
        normDocEntity.includes(normContractor) ||
        normContractor.includes(normDocEntity)
      ));

      if (!entityMatches) {
        validationFailures.push(`Entity name mismatch (document lists "${extractedEntityName}", expected "${contractorData.company_name}").`);
      } else {
        validationSuccesses.push(`Entity matched: ${contractorData.company_name}`);
      }
    }

    // Rule 5: Required Dates & Expiration Validation
    const extractedExpDate = extractedJson.expirationDate?.value?.trim();
    const isW9orTax = docData.type === 'W9' || docData.type === 'TAX_DOCUMENT' || docData.type === 'SAFETY_CERTIFICATE';
    
    let isExpired = false;
    let isExpiringSoon = false;

    if (extractedExpDate) {
      const targetTime = new Date(extractedExpDate).getTime();
      if (isNaN(targetTime)) {
        validationFailures.push(`Extracted expiration date ("${extractedExpDate}") is not a valid date format.`);
      } else if (targetTime < Date.now()) {
        isExpired = true;
        validationFailures.push(`Document expired on ${extractedExpDate}.`);
      } else {
        const daysRemaining = Math.ceil((targetTime - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          isExpiringSoon = true;
          validationSuccesses.push(`Document active (expiring in ${daysRemaining} days on ${extractedExpDate})`);
        } else {
          validationSuccesses.push(`Document active (unexpired through ${extractedExpDate})`);
        }
      }
    } else if (!isW9orTax) {
      validationFailures.push('Missing required expiration date for policy/license.');
    } else {
      validationSuccesses.push('Permanent compliance record (no expiration date required)');
    }

    // Rule 6: Required Policy / License / Number Fields
    const isInsuranceType = ['GENERAL_LIABILITY', 'CERTIFICATE_OF_INSURANCE', 'WORKERS_COMPENSATION', 'AUTO_INSURANCE'].includes(docData.type);
    const isLicenseType = ['BUSINESS_LICENSE', 'PROFESSIONAL_LICENSE'].includes(docData.type);

    if (isInsuranceType) {
      if (!extractedJson.policyNumber?.value && !extractedJson.documentNumber?.value) {
        validationFailures.push('Missing policy number identifier.');
      }
      if (!extractedJson.carrierName?.value) {
        validationFailures.push('Missing underwriting insurance carrier name.');
      }
    } else if (isLicenseType) {
      if (!extractedJson.licenseNumber?.value && !extractedJson.documentNumber?.value) {
        validationFailures.push('Missing state/trade license registration number.');
      }
    }

    // Rule 7: Coverage Limit Validation (General Liability >= $1,000,000 threshold)
    if (docData.type === 'GENERAL_LIABILITY' || docData.type === 'CERTIFICATE_OF_INSURANCE') {
      const rawLimit = extractedJson.coverageLimit?.value;
      const limit = typeof rawLimit === 'number' ? rawLimit : (typeof rawLimit === 'string' ? parseFloat(rawLimit.replace(/[^0-9.]/g, '')) : null);
      
      if (limit !== null && !isNaN(limit)) {
        if (limit < 1000000) {
          validationFailures.push(`Coverage limit ($${limit.toLocaleString()}) is below required $1,000,000 threshold.`);
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
          validationSuccesses.push(`General Liability coverage limit satisfies requirement ($${limit.toLocaleString()})`);
          requirementChecks.push({
            requirementKey: 'insuranceRequired',
            requirementName: 'General Liability Coverage',
            required: true,
            satisfied: true,
            extractedValue: `$${limit.toLocaleString()}`,
            expectedThreshold: '$1,000,000',
            status: 'SATISFIED',
          });
        }
      }
    }

    // Rule 8: AI Suspicion / Ambiguity Flags
    if (extractedJson.reviewRecommended) {
      validationFailures.push(extractedJson.reviewReason || 'AI flagged document ambiguity or evidence inconsistency.');
    }

    // Two-Tier Decision: Auto-Verify if ALL conditions pass, else Review Required
    const canAutoVerify = validationFailures.length === 0 && !isExpired;
    const finalProcessingStatus = canAutoVerify ? 'VERIFIED' : 'REVIEW_REQUIRED';
    
    let finalDocStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING_REVIEW' = 'PENDING_REVIEW';
    if (isExpired) {
      finalDocStatus = 'EXPIRED';
    } else if (canAutoVerify) {
      finalDocStatus = isExpiringSoon ? 'EXPIRING' : 'VALID';
    } else {
      finalDocStatus = 'PENDING_REVIEW';
    }

    const finalReviewReason = canAutoVerify
      ? `Auto-verified: All compliance checks passed (${Math.round(overallConf * 100)}% confidence)`
      : `Manual review required: ${validationFailures.join('; ')}`;

    console.log(`[handleProcessExtraction] reqId=${reqId} Decision=${finalProcessingStatus} DocStatus=${finalDocStatus} Reason=${finalReviewReason}`);

    // 10. Record Document Extraction Record (Audit Trail & Evidence)
    const { data: extractionRecord, error: insertExtError } = await supabase
      .from('document_extractions')
      .insert({
        workspace_id: workspaceId,
        contractor_id: contractorId,
        document_id: documentId,
        document_type_detected: extractedJson.documentTypeDetected || 'UNKNOWN',
        raw_extracted_json: extractedJson,
        normalized_data: normalizedData,
        evidence_data: {
          overallConfidence: overallConf,
          reviewReason: finalReviewReason,
          validationFailures,
          validationSuccesses,
          autoVerified: canAutoVerify,
          entityMatch: {
            matched: Boolean(entityMatches),
            extracted: extractedEntityName || null,
            expected: contractorData.company_name,
          },
          categoryMatch: {
            matched: Boolean(isTypeMatch),
            detected: detectedType,
            expected: expectedType,
          },
          expirationCheck: {
            valid: !isExpired && (Boolean(extractedExpDate) || isW9orTax),
            expired: isExpired,
            expirationDate: extractedExpDate || null,
          },
          policyNumberCheck: {
            present: Boolean(extractedJson.policyNumber?.value || extractedJson.documentNumber?.value || extractedJson.licenseNumber?.value),
            value: extractedJson.policyNumber?.value || extractedJson.documentNumber?.value || extractedJson.licenseNumber?.value || null,
          },
        },
        requirement_checks: requirementChecks,
        status: finalProcessingStatus,
        model_used: modelUsed,
      })
      .select()
      .single();

    if (insertExtError) {
      console.warn(`[handleProcessExtraction] reqId=${reqId} Could not insert extraction record:`, insertExtError);
    }

    // 11. Update Documents Table
    const updatePayload: any = {
      processing_status: finalProcessingStatus,
      status: finalDocStatus,
      processing_error: null,
      processed_at: new Date().toISOString(),
      extracted_data: normalizedData,
      review_reason: finalReviewReason,
    };

    if (canAutoVerify) {
      updatePayload.verified_at = new Date().toISOString();
      updatePayload.verified_by = null; // Automated system verification
    }

    // Update expiration date if extracted and not already manually set
    if (extractedExpDate && !docData.expires_at) {
      updatePayload.expires_at = extractedExpDate;
    }

    const { data: updatedDoc, error: docUpdateError } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', documentId)
      .select()
      .single();

    if (docUpdateError) {
      console.error(`[handleProcessExtraction] reqId=${reqId} Error updating document row:`, docUpdateError);
    }

    // 12. Log Immutable Audit Activity
    try {
      await supabase.from('activities').insert({
        workspace_id: workspaceId,
        contractor_id: contractorId,
        document_id: documentId,
        action: canAutoVerify ? 'DOCUMENT_AUTO_VERIFIED' : 'DOCUMENT_REVIEW_REQUIRED',
        description: canAutoVerify 
          ? `Auto-verified ${docData.name} for ${contractorData.company_name} (Confidence: ${Math.round(overallConf * 100)}%, All checks passed)`
          : `Document ${docData.name} requires human inspection: ${validationFailures.join('; ')}`,
      });
    } catch {
      // Activity logging optional
    }

    return res.json({
      success: true,
      document: updatedDoc || docData,
      extraction: extractionRecord,
      processingStatus: finalProcessingStatus,
    });
  } catch (error: any) {
    console.error(`[handleProcessExtraction] reqId=${reqId} Fatal error:`, error);
    try {
      if (req.body?.documentId && req.headers?.authorization) {
        const supabase = getSupabaseUserClient(req.headers.authorization);
        await supabase
          .from('documents')
          .update({
            processing_status: 'FAILED',
            processing_error: error?.message || 'Document intelligence processing failed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', req.body.documentId);
      }
    } catch (e) {
      console.error(`[handleProcessExtraction] reqId=${reqId} Failed to set FAILED status:`, e);
    }

    return res.status(500).json({
      error: error?.message || 'Document intelligence processing failed',
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
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const userId = userData.user.id;

    // 2. Verify workspace membership or ownership (Authorization isolation & IDOR defense)
    let isAuthorized = false;
    let userRole = 'VIEWER';
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberData) {
      isAuthorized = true;
      userRole = memberData.role || 'MEMBER';
    } else {
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('id, owner_id')
        .eq('id', workspaceId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (wsData) {
        isAuthorized = true;
        userRole = 'ADMIN';
      }
    }

    if (!isAuthorized) {
      console.warn(`[handleManualVerification] reqId=${reqId} Forbidden: user ${userId} not in workspace ${workspaceId}`);
      return res.status(403).json({ error: 'Forbidden: Access denied to this workspace' });
    }

    if (userRole === 'VIEWER') {
      console.warn(`[handleManualVerification] reqId=${reqId} Forbidden: viewer write-denial for user ${userId}`);
      return res.status(403).json({ error: 'Forbidden: Write or executive access is denied for VIEWER role.' });
    }

    // 3. Verify document belongs to the workspace
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id, contractor_id, name')
      .eq('id', documentId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (docError || !docData) {
      console.warn(`[handleManualVerification] reqId=${reqId} Document not found in workspace: doc=${documentId}, ws=${workspaceId}`);
      return res.status(404).json({ error: 'Document not found in workspace' });
    }

    // Determine document validity & expiration status on manual decision
    let calculatedDocStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'REJECTED' | 'PENDING_REVIEW' = 'PENDING_REVIEW';
    if (status === 'VERIFIED') {
      const expDate = req.body?.expiresAt || null;
      if (expDate) {
        const expTime = new Date(expDate).getTime();
        if (!isNaN(expTime)) {
          if (expTime < Date.now()) {
            calculatedDocStatus = 'EXPIRED';
          } else {
            const daysRemaining = Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24));
            calculatedDocStatus = daysRemaining <= 30 ? 'EXPIRING' : 'VALID';
          }
        } else {
          calculatedDocStatus = 'VALID';
        }
      } else {
        calculatedDocStatus = 'VALID';
      }
    } else if (status === 'FAILED') {
      calculatedDocStatus = 'REJECTED';
    } else {
      calculatedDocStatus = 'PENDING_REVIEW';
    }

    const updateFields: any = {
      processing_status: status, // 'VERIFIED' or 'REVIEW_REQUIRED' or 'FAILED'
      status: calculatedDocStatus,
      review_reason: reviewReason || (status === 'VERIFIED' ? 'Manually approved and verified by compliance officer' : null),
    };

    if (status === 'VERIFIED') {
      updateFields.verified_at = new Date().toISOString();
      updateFields.verified_by = userData.user.id;
    }

    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update(updateFields)
      .eq('id', documentId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error(`[handleManualVerification] Update error:`, updateError);
      return res.status(500).json({ error: 'Failed to update document verification status' });
    }

    // Action name and description
    let actionName = 'DOCUMENT_REVIEWED';
    let actionDesc = `User updated document review status: ${updatedDoc.name}`;
    if (status === 'VERIFIED') {
      actionName = 'DOCUMENT_MANUALLY_VERIFIED';
      actionDesc = `Manually approved and verified ${updatedDoc.name} by compliance officer (${userData.user.email || 'reviewer'})${reviewReason ? `: ${reviewReason}` : ''}`;
    } else if (status === 'FAILED') {
      actionName = 'DOCUMENT_REJECTED';
      actionDesc = `Rejected document ${updatedDoc.name} by compliance officer (${userData.user.email || 'reviewer'})${reviewReason ? `: ${reviewReason}` : ''}`;
    } else if (status === 'REVIEW_REQUIRED') {
      actionName = 'DOCUMENT_FLAGGED_REVIEW';
      actionDesc = `Flagged document ${updatedDoc.name} for compliance review: ${reviewReason || 'Manual review required'}`;
    }

    await supabase.from('activities').insert({
      workspace_id: workspaceId,
      contractor_id: contractorId,
      document_id: documentId,
      user_id: userData.user.id,
      action: actionName,
      description: actionDesc,
    });

    return res.json({ success: true, document: updatedDoc });
  } catch (err: any) {
    console.error(`[handleManualVerification] Error reqId=${reqId}:`, err);
    return res.status(500).json({ error: 'Manual verification failed' });
  }
}

/**
 * Handle Health Check
 */
export function handleHealth(req: any, res: any) {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
