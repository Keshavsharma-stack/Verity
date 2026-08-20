import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  ComplianceRequirement, 
  ComplianceStatus, 
  ComplianceGateStatus,
  ComplianceGateResult,
  RequirementEvaluation,
  Document, 
  DocumentType,
  DocumentExtraction
} from '../types';
import { evaluateExpiration } from '../lib/expiration';

export const DEFAULT_COMPLIANCE_REQUIREMENTS: ComplianceRequirement = {
  insuranceRequired: true,
  businessLicenseRequired: true,
  professionalLicenseRequired: false,
  safetyDocumentationRequired: false,
  taxDocumentationRequired: true,
  workersCompRequired: true,
};

// Requirement metadata taxonomy
export const REQUIREMENT_METADATA: Record<
  keyof ComplianceRequirement, 
  { name: string; documentTypes: DocumentType[]; defaultCoverageMin?: number; requiresExpirationDate: boolean }
> = {
  insuranceRequired: {
    name: 'General Liability Insurance',
    documentTypes: ['GENERAL_LIABILITY', 'CERTIFICATE_OF_INSURANCE'],
    defaultCoverageMin: 1000000,
    requiresExpirationDate: true,
  },
  workersCompRequired: {
    name: "Workers' Compensation Insurance",
    documentTypes: ['WORKERS_COMPENSATION'],
    requiresExpirationDate: true,
  },
  businessLicenseRequired: {
    name: 'State Business License',
    documentTypes: ['BUSINESS_LICENSE'],
    requiresExpirationDate: true,
  },
  professionalLicenseRequired: {
    name: 'Professional Trade License',
    documentTypes: ['PROFESSIONAL_LICENSE'],
    requiresExpirationDate: true,
  },
  taxDocumentationRequired: {
    name: 'Taxpayer Identification (W-9)',
    documentTypes: ['W9', 'TAX_DOCUMENT'],
    requiresExpirationDate: false,
  },
  safetyDocumentationRequired: {
    name: 'OSHA / Safety Certification',
    documentTypes: ['SAFETY_CERTIFICATE'],
    requiresExpirationDate: false,
  },
};

// Maps requirement keys to document types
export const REQUIREMENT_TYPE_MAPPINGS: Record<keyof ComplianceRequirement, DocumentType[]> = {
  insuranceRequired: ['GENERAL_LIABILITY', 'CERTIFICATE_OF_INSURANCE'],
  workersCompRequired: ['WORKERS_COMPENSATION'],
  businessLicenseRequired: ['BUSINESS_LICENSE'],
  professionalLicenseRequired: ['PROFESSIONAL_LICENSE'],
  taxDocumentationRequired: ['W9', 'TAX_DOCUMENT'],
  safetyDocumentationRequired: ['SAFETY_CERTIFICATE'],
};

/**
 * Normalizes entity name strings for robust comparison without fuzzy false-positives.
 */
export function normalizeEntityName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|co|incorporated|company|ltd|limited|d\/b\/a|dba)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Validates whether the extracted entity name matches the contractor's legal company name.
 */
export function checkEntityNameMatch(
  contractorName: string, 
  extractedEntityName?: string | null
): { match: boolean; reason?: string } {
  if (!extractedEntityName || typeof extractedEntityName !== 'string') {
    return { match: true }; // No extracted entity name to contradict
  }

  const normContractor = normalizeEntityName(contractorName);
  const normExtracted = normalizeEntityName(extractedEntityName);

  if (!normContractor || !normExtracted) {
    return { match: true };
  }

  if (
    normContractor === normExtracted ||
    normContractor.includes(normExtracted) ||
    normExtracted.includes(normContractor)
  ) {
    return { match: true };
  }

  return {
    match: false,
    reason: `Extracted entity name ("${extractedEntityName}") does not match contractor company name ("${contractorName}")`,
  };
}

/**
 * Parses numeric monetary values for coverage threshold checks.
 */
export function parseNumericCoverage(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export const complianceService = {
  /**
   * Deterministic Evaluation of a Single Requirement for a contractor.
   */
  evaluateSingleRequirement(
    reqKey: keyof ComplianceRequirement,
    isRequired: boolean,
    contractorName: string,
    documents: Document[],
    extractions: Map<string, DocumentExtraction> = new Map()
  ): RequirementEvaluation {
    const meta = REQUIREMENT_METADATA[reqKey];
    const allowedTypes = meta.documentTypes;
    
    // Find documents matching allowed types
    const matchedDocs = documents.filter(d => allowedTypes.includes(d.type));

    if (!isRequired) {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: false,
        status: 'SATISFIED',
        reason: 'Optional requirement — not mandated by policy',
      };
    }

    if (matchedDocs.length === 0) {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: true,
        status: 'MISSING',
        reason: `Missing required ${meta.name} document`,
      };
    }

    // Sort documents: prioritize VERIFIED, then EXTRACTED, then newest uploaded
    const sortedDocs = [...matchedDocs].sort((a, b) => {
      if (a.processingStatus === 'VERIFIED' && b.processingStatus !== 'VERIFIED') return -1;
      if (b.processingStatus === 'VERIFIED' && a.processingStatus !== 'VERIFIED') return 1;
      const dateA = new Date(a.uploadedAt || 0).getTime();
      const dateB = new Date(b.uploadedAt || 0).getTime();
      return dateB - dateA;
    });

    const primaryDoc = sortedDocs[0];
    const extraction = extractions.get(primaryDoc.id);
    const extractedData = primaryDoc.extractedData || extraction?.normalizedData;

    // Check 1: Expiration status
    let isExpired = false;
    let isExpiringSoon = false;
    let daysRemaining: number | null = null;

    if (primaryDoc.expiresAt) {
      const expEval = evaluateExpiration(primaryDoc.expiresAt);
      isExpired = expEval.isExpired;
      isExpiringSoon = expEval.isExpiringSoon;
      daysRemaining = expEval.daysRemaining;
    } else if (meta.requiresExpirationDate) {
      // Insurance or license missing expiration date
      if (primaryDoc.processingStatus !== 'VERIFIED') {
        return {
          requirementId: reqKey,
          name: meta.name,
          required: true,
          status: 'MANUAL_REVIEW_REQUIRED',
          documentId: primaryDoc.id,
          documentName: primaryDoc.name,
          reason: `Document is missing required expiration date for ${meta.name}`,
        };
      }
    }

    if (isExpired || primaryDoc.status === 'EXPIRED') {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: true,
        status: 'EXPIRED',
        documentId: primaryDoc.id,
        documentName: primaryDoc.name,
        expiresAt: primaryDoc.expiresAt,
        daysRemaining,
        reason: `Document expired ${daysRemaining !== null ? `${Math.abs(daysRemaining)} days ago` : ''} (${primaryDoc.expiresAt})`,
      };
    }

    // Check 2: Human Verification (if approved by authorized reviewer, respects expiration)
    if (primaryDoc.processingStatus === 'VERIFIED') {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: true,
        status: isExpiringSoon ? 'EXPIRING' : 'SATISFIED',
        documentId: primaryDoc.id,
        documentName: primaryDoc.name,
        expiresAt: primaryDoc.expiresAt,
        daysRemaining,
        reason: isExpiringSoon 
          ? `Verified document expires in ${daysRemaining} days` 
          : 'Verified and active by compliance reviewer',
      };
    }

    // Check 3: Review Required Flags from processing
    if (primaryDoc.processingStatus === 'REVIEW_REQUIRED' || primaryDoc.reviewReason) {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: true,
        status: 'MANUAL_REVIEW_REQUIRED',
        documentId: primaryDoc.id,
        documentName: primaryDoc.name,
        expiresAt: primaryDoc.expiresAt,
        daysRemaining,
        reason: primaryDoc.reviewReason || 'Flagged for compliance review (evidence ambiguity)',
      };
    }

    if (primaryDoc.processingStatus === 'FAILED') {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: true,
        status: 'MANUAL_REVIEW_REQUIRED',
        documentId: primaryDoc.id,
        documentName: primaryDoc.name,
        expiresAt: primaryDoc.expiresAt,
        daysRemaining,
        reason: primaryDoc.processingError || 'AI extraction failed; manual verification required',
      };
    }

    // Check 4: AI Extracted Evidence Validation
    if (extractedData) {
      // Entity name check
      const extractedEntity = extractedData.entityName?.value;
      const entityMatch = checkEntityNameMatch(contractorName, extractedEntity);
      if (!entityMatch.match) {
        return {
          requirementId: reqKey,
          name: meta.name,
          required: true,
          status: 'MANUAL_REVIEW_REQUIRED',
          documentId: primaryDoc.id,
          documentName: primaryDoc.name,
          expiresAt: primaryDoc.expiresAt,
          daysRemaining,
          reason: entityMatch.reason,
          extractedValue: extractedEntity,
        };
      }

      // Coverage threshold check (for General Liability)
      if (meta.defaultCoverageMin && (reqKey === 'insuranceRequired')) {
        const rawLimit = extractedData.coverageLimit?.value;
        const parsedLimit = parseNumericCoverage(rawLimit);

        if (parsedLimit !== null && parsedLimit < meta.defaultCoverageMin) {
          return {
            requirementId: reqKey,
            name: meta.name,
            required: true,
            status: 'DEFICIENT',
            documentId: primaryDoc.id,
            documentName: primaryDoc.name,
            expiresAt: primaryDoc.expiresAt,
            daysRemaining,
            extractedValue: `$${parsedLimit.toLocaleString()}`,
            expectedThreshold: `$${meta.defaultCoverageMin.toLocaleString()}`,
            reason: `Coverage limit ($${parsedLimit.toLocaleString()}) is below required minimum threshold ($${meta.defaultCoverageMin.toLocaleString()})`,
          };
        }
      }

      // Endorsements check (if Additional Insured is explicitly false where required)
      if (reqKey === 'insuranceRequired' && extractedData.additionalInsured?.value === false) {
        return {
          requirementId: reqKey,
          name: meta.name,
          required: true,
          status: 'MANUAL_REVIEW_REQUIRED',
          documentId: primaryDoc.id,
          documentName: primaryDoc.name,
          expiresAt: primaryDoc.expiresAt,
          daysRemaining,
          reason: 'Certificate indicates Additional Insured endorsement is not granted',
        };
      }
    }

    // Check 5: If document is still in UPLOADED or PROCESSING state
    if (primaryDoc.processingStatus === 'UPLOADED' || primaryDoc.processingStatus === 'PROCESSING') {
      return {
        requirementId: reqKey,
        name: meta.name,
        required: true,
        status: 'MANUAL_REVIEW_REQUIRED',
        documentId: primaryDoc.id,
        documentName: primaryDoc.name,
        expiresAt: primaryDoc.expiresAt,
        daysRemaining,
        reason: 'Document pending AI extraction and verification',
      };
    }

    // Satisfied (active or expiring)
    return {
      requirementId: reqKey,
      name: meta.name,
      required: true,
      status: isExpiringSoon ? 'EXPIRING' : 'SATISFIED',
      documentId: primaryDoc.id,
      documentName: primaryDoc.name,
      expiresAt: primaryDoc.expiresAt,
      daysRemaining,
      reason: isExpiringSoon ? `Expires soon (${daysRemaining} days remaining)` : 'Requirement satisfied',
    };
  },

  /**
   * Pure Deterministic Compliance Gate Calculation for a contractor.
   */
  evaluateCompliancePure(
    contractorId: string,
    workspaceId: string,
    contractorName: string,
    requirements: ComplianceRequirement,
    documents: Document[],
    extractions: Map<string, DocumentExtraction> = new Map()
  ): ComplianceGateResult {
    const reqKeys = Object.keys(REQUIREMENT_METADATA) as Array<keyof ComplianceRequirement>;
    
    const evaluations: RequirementEvaluation[] = reqKeys.map(key => 
      this.evaluateSingleRequirement(
        key,
        !!requirements[key],
        contractorName,
        documents,
        extractions
      )
    );

    const activeEvaluations = evaluations.filter(e => e.required);

    const requiredCount = activeEvaluations.length;
    const missingCount = activeEvaluations.filter(e => e.status === 'MISSING').length;
    const expiredCount = activeEvaluations.filter(e => e.status === 'EXPIRED').length;
    const deficientCount = activeEvaluations.filter(e => e.status === 'DEFICIENT').length;
    const reviewRequiredCount = activeEvaluations.filter(e => e.status === 'MANUAL_REVIEW_REQUIRED').length;
    const expiringCount = activeEvaluations.filter(e => e.status === 'EXPIRING').length;
    const validCount = activeEvaluations.filter(e => e.status === 'SATISFIED').length;

    let overallStatus: ComplianceGateStatus = 'READY';

    if (missingCount > 0 || expiredCount > 0 || deficientCount > 0) {
      overallStatus = 'NOT_READY';
    } else if (reviewRequiredCount > 0) {
      overallStatus = 'REVIEW_REQUIRED';
    } else {
      overallStatus = 'READY';
    }

    // Determine next required action
    let nextRequiredAction: string | null = null;
    if (missingCount > 0) {
      const missingNames = activeEvaluations.filter(e => e.status === 'MISSING').map(e => e.name);
      nextRequiredAction = `Upload missing document(s): ${missingNames.join(', ')}`;
    } else if (expiredCount > 0) {
      const expiredNames = activeEvaluations.filter(e => e.status === 'EXPIRED').map(e => e.name);
      nextRequiredAction = `Renew expired document(s): ${expiredNames.join(', ')}`;
    } else if (deficientCount > 0) {
      nextRequiredAction = 'Provide updated certificate meeting required coverage thresholds';
    } else if (reviewRequiredCount > 0) {
      nextRequiredAction = 'Complete compliance review for pending document(s)';
    } else if (expiringCount > 0) {
      nextRequiredAction = 'Monitor upcoming policy renewal dates';
    } else {
      nextRequiredAction = 'All compliance requirements verified and active';
    }

    // Determine latest review history
    let lastReview: { reviewedAt?: string; reviewedBy?: string; reason?: string } | null = null;
    const reviewedDocs = documents.filter(d => d.verifiedAt || d.processedAt);
    if (reviewedDocs.length > 0) {
      const latestDoc = [...reviewedDocs].sort((a, b) => {
        const timeA = new Date(a.verifiedAt || a.processedAt || 0).getTime();
        const timeB = new Date(b.verifiedAt || b.processedAt || 0).getTime();
        return timeB - timeA;
      })[0];

      lastReview = {
        reviewedAt: latestDoc.verifiedAt || latestDoc.processedAt,
        reviewedBy: latestDoc.verifiedBy,
        reason: latestDoc.reviewReason,
      };
    }

    return {
      status: overallStatus,
      contractorId,
      workspaceId,
      requiredCount,
      validCount,
      expiringCount,
      expiredCount,
      missingCount,
      reviewRequiredCount,
      requirements: evaluations,
      evaluatedAt: new Date().toISOString(),
      lastReview,
      nextRequiredAction,
    };
  },

  /**
   * Main Compliance Gate API: Evaluates a single contractor against real Supabase records.
   */
  async evaluateContractorCompliance(
    contractorId: string,
    workspaceId: string
  ): Promise<{ data: ComplianceGateResult; error?: string }> {
    const defaultResult: ComplianceGateResult = {
      status: 'REVIEW_REQUIRED',
      contractorId,
      workspaceId,
      requiredCount: 0,
      validCount: 0,
      expiringCount: 0,
      expiredCount: 0,
      missingCount: 0,
      reviewRequiredCount: 0,
      requirements: [],
      evaluatedAt: new Date().toISOString(),
      lastReview: null,
      nextRequiredAction: null,
    };

    if (!contractorId || !workspaceId || !isSupabaseConfigured() || !supabase) {
      return { data: defaultResult };
    }

    try {
      const [contractorRes, reqsRes, docsRes, extractionsRes] = await Promise.all([
        supabase
          .from('contractors')
          .select('id, company_name, workspace_id')
          .eq('id', contractorId)
          .eq('workspace_id', workspaceId)
          .maybeSingle(),
        supabase
          .from('compliance_requirements')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('workspace_id', workspaceId)
          .maybeSingle(),
        supabase
          .from('documents')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('workspace_id', workspaceId),
        supabase
          .from('document_extractions')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }),
      ]);

      if (contractorRes.error || !contractorRes.data) {
        return { data: defaultResult, error: contractorRes.error?.message || 'Contractor not found' };
      }

      const contractorName = contractorRes.data.company_name;

      const reqData: ComplianceRequirement = reqsRes.data
        ? {
            insuranceRequired: reqsRes.data.insurance_required ?? true,
            businessLicenseRequired: reqsRes.data.business_license_required ?? true,
            professionalLicenseRequired: reqsRes.data.professional_license_required ?? false,
            safetyDocumentationRequired: reqsRes.data.safety_documentation_required ?? false,
            taxDocumentationRequired: reqsRes.data.tax_documentation_required ?? true,
            workersCompRequired: reqsRes.data.workers_comp_required ?? true,
          }
        : DEFAULT_COMPLIANCE_REQUIREMENTS;

      const docs: Document[] = (docsRes.data || []).map((row: any) => ({
        id: row.id,
        contractorId: row.contractor_id,
        workspaceId: row.workspace_id,
        name: row.name,
        type: row.type as DocumentType,
        fileUrl: row.file_url,
        fileSize: row.file_size || 0,
        status: row.status,
        processingStatus: row.processing_status,
        processingError: row.processing_error,
        processedAt: row.processed_at,
        extractedData: row.extracted_data,
        reviewReason: row.review_reason,
        verifiedAt: row.verified_at,
        verifiedBy: row.verified_by,
        uploadedAt: row.uploaded_at,
        expiresAt: row.expires_at || undefined,
      }));

      const extractionsMap = new Map<string, DocumentExtraction>();
      if (extractionsRes.data) {
        for (const extRow of extractionsRes.data) {
          if (!extractionsMap.has(extRow.document_id)) {
            extractionsMap.set(extRow.document_id, {
              id: extRow.id,
              workspaceId: extRow.workspace_id,
              contractorId: extRow.contractor_id,
              documentId: extRow.document_id,
              documentTypeDetected: extRow.document_type_detected,
              rawExtractedJson: extRow.raw_extracted_json || {},
              normalizedData: extRow.normalized_data || {},
              evidenceData: extRow.evidence_data || {},
              requirementChecks: extRow.requirement_checks || [],
              status: extRow.status,
              modelUsed: extRow.model_used,
              errorMessage: extRow.error_message,
              createdAt: extRow.created_at,
            });
          }
        }
      }

      const result = this.evaluateCompliancePure(
        contractorId,
        workspaceId,
        contractorName,
        reqData,
        docs,
        extractionsMap
      );

      return { data: result };
    } catch (err: any) {
      return { data: defaultResult, error: err?.message || 'Compliance evaluation failed' };
    }
  },

  /**
   * High-Performance Batched Compliance Evaluation for all contractors in a workspace.
   * Eliminates N+1 query loops for directory, dashboard, and matrix views.
   */
  async evaluateWorkspaceCompliance(
    workspaceId: string
  ): Promise<{ data: Map<string, ComplianceGateResult>; error?: string }> {
    const resultMap = new Map<string, ComplianceGateResult>();

    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { data: resultMap };
    }

    try {
      const [contractorsRes, reqsRes, docsRes, extractionsRes] = await Promise.all([
        supabase
          .from('contractors')
          .select('id, company_name, workspace_id')
          .eq('workspace_id', workspaceId),
        supabase
          .from('compliance_requirements')
          .select('*')
          .eq('workspace_id', workspaceId),
        supabase
          .from('documents')
          .select('*')
          .eq('workspace_id', workspaceId),
        supabase
          .from('document_extractions')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }),
      ]);

      if (contractorsRes.error) {
        return { data: resultMap, error: contractorsRes.error.message };
      }

      const contractors = (contractorsRes.data || []).filter(
        (c: any) => !c.company_name?.startsWith('[TEST') && !c.company_name?.startsWith('[E2E')
      );
      const reqsByContractor = new Map<string, ComplianceRequirement>();
      for (const row of reqsRes.data || []) {
        reqsByContractor.set(row.contractor_id, {
          insuranceRequired: row.insurance_required ?? true,
          businessLicenseRequired: row.business_license_required ?? true,
          professionalLicenseRequired: row.professional_license_required ?? false,
          safetyDocumentationRequired: row.safety_documentation_required ?? false,
          taxDocumentationRequired: row.tax_documentation_required ?? true,
          workersCompRequired: row.workers_comp_required ?? true,
        });
      }

      const docsByContractor = new Map<string, Document[]>();
      for (const row of docsRes.data || []) {
        const doc: Document = {
          id: row.id,
          contractorId: row.contractor_id,
          workspaceId: row.workspace_id,
          name: row.name,
          type: row.type as DocumentType,
          fileUrl: row.file_url,
          fileSize: row.file_size || 0,
          status: row.status,
          processingStatus: row.processing_status,
          processingError: row.processing_error,
          processedAt: row.processed_at,
          extractedData: row.extracted_data,
          reviewReason: row.review_reason,
          verifiedAt: row.verified_at,
          verifiedBy: row.verified_by,
          uploadedAt: row.uploaded_at,
          expiresAt: row.expires_at || undefined,
        };
        const list = docsByContractor.get(row.contractor_id) || [];
        list.push(doc);
        docsByContractor.set(row.contractor_id, list);
      }

      const extractionsMap = new Map<string, DocumentExtraction>();
      for (const extRow of extractionsRes.data || []) {
        if (!extractionsMap.has(extRow.document_id)) {
          extractionsMap.set(extRow.document_id, {
            id: extRow.id,
            workspaceId: extRow.workspace_id,
            contractorId: extRow.contractor_id,
            documentId: extRow.document_id,
            documentTypeDetected: extRow.document_type_detected,
            rawExtractedJson: extRow.raw_extracted_json || {},
            normalizedData: extRow.normalized_data || {},
            evidenceData: extRow.evidence_data || {},
            requirementChecks: extRow.requirement_checks || [],
            status: extRow.status,
            modelUsed: extRow.model_used,
            errorMessage: extRow.error_message,
            createdAt: extRow.created_at,
          });
        }
      }

      for (const contractor of contractors) {
        const reqs = reqsByContractor.get(contractor.id) || DEFAULT_COMPLIANCE_REQUIREMENTS;
        const docs = docsByContractor.get(contractor.id) || [];
        const result = this.evaluateCompliancePure(
          contractor.id,
          workspaceId,
          contractor.company_name,
          reqs,
          docs,
          extractionsMap
        );
        resultMap.set(contractor.id, result);
      }

      return { data: resultMap };
    } catch (err: any) {
      return { data: resultMap, error: err?.message || 'Failed to evaluate workspace compliance' };
    }
  },

  /**
   * Helper mapping from ComplianceGateResult to database ComplianceStatus column.
   */
  mapGateStatusToDbStatus(gateResult: ComplianceGateResult): ComplianceStatus {
    if (gateResult.status === 'NOT_READY') return 'NON_COMPLIANT';
    if (gateResult.status === 'REVIEW_REQUIRED') return 'PENDING_REVIEW';
    if (gateResult.expiringCount > 0) return 'EXPIRING';
    return 'COMPLIANT';
  },

  /**
   * Recalculates and updates the contractor's status column in Supabase based on the compliance gate.
   * Logs an audit record ONLY when status actually changes to prevent noise on page reloads.
   */
  async syncContractorStatus(workspaceId: string, contractorId: string): Promise<ComplianceStatus> {
    if (!workspaceId || !contractorId || !isSupabaseConfigured() || !supabase) {
      return 'PENDING_REVIEW';
    }

    try {
      // 1. Fetch current stored status
      const { data: currentContractor } = await supabase
        .from('contractors')
        .select('id, status, company_name')
        .eq('id', contractorId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const oldStatus = currentContractor?.status as ComplianceStatus | undefined;

      // 2. Evaluate with compliance gate engine
      const { data: gateResult } = await this.evaluateContractorCompliance(contractorId, workspaceId);
      const newStatus = this.mapGateStatusToDbStatus(gateResult);

      // 3. Update contractor table
      await supabase
        .from('contractors')
        .update({
          status: newStatus,
          last_updated: new Date().toISOString(),
        })
        .eq('id', contractorId)
        .eq('workspace_id', workspaceId);

      // 4. Log activity ONLY if status actually changed
      if (oldStatus && oldStatus !== newStatus) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user?.id || null;
          await supabase.from('activities').insert({
            workspace_id: workspaceId,
            contractor_id: contractorId,
            user_id: userId,
            action: 'COMPLIANCE_STATUS_CHANGED',
            description: `Compliance status for ${currentContractor?.company_name || 'Contractor'} changed from ${oldStatus} to ${newStatus} (${gateResult.status})`,
          });
        } catch {
          // Ignore activity logging errors
        }
      }

      return newStatus;
    } catch {
      return 'PENDING_REVIEW';
    }
  },

  /**
   * Fetch compliance requirements for a contractor from Supabase.
   */
  async getRequirements(
    workspaceId: string,
    contractorId: string
  ): Promise<{ data: ComplianceRequirement; error?: string }> {
    if (!workspaceId || !contractorId || !isSupabaseConfigured() || !supabase) {
      return { data: DEFAULT_COMPLIANCE_REQUIREMENTS };
    }

    try {
      const { data, error } = await supabase
        .from('compliance_requirements')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error || !data) {
        return { data: DEFAULT_COMPLIANCE_REQUIREMENTS };
      }

      return {
        data: {
          insuranceRequired: data.insurance_required ?? true,
          businessLicenseRequired: data.business_license_required ?? true,
          professionalLicenseRequired: data.professional_license_required ?? false,
          safetyDocumentationRequired: data.safety_documentation_required ?? false,
          taxDocumentationRequired: data.tax_documentation_required ?? true,
          workersCompRequired: data.workers_comp_required ?? true,
        },
      };
    } catch (err: any) {
      return { data: DEFAULT_COMPLIANCE_REQUIREMENTS, error: err?.message || 'Failed to fetch requirements' };
    }
  },

  /**
   * Save or update compliance requirements for a contractor.
   */
  async updateRequirements(
    workspaceId: string,
    contractorId: string,
    requirements: Partial<ComplianceRequirement>
  ): Promise<{ data: ComplianceRequirement | null; error?: string }> {
    if (!workspaceId || !contractorId || !isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      const payload: any = {
        contractor_id: contractorId,
        workspace_id: workspaceId,
      };

      if (requirements.insuranceRequired !== undefined) payload.insurance_required = requirements.insuranceRequired;
      if (requirements.businessLicenseRequired !== undefined) payload.business_license_required = requirements.businessLicenseRequired;
      if (requirements.professionalLicenseRequired !== undefined) payload.professional_license_required = requirements.professionalLicenseRequired;
      if (requirements.safetyDocumentationRequired !== undefined) payload.safety_documentation_required = requirements.safetyDocumentationRequired;
      if (requirements.taxDocumentationRequired !== undefined) payload.tax_documentation_required = requirements.taxDocumentationRequired;
      if (requirements.workersCompRequired !== undefined) payload.workers_comp_required = requirements.workersCompRequired;

      const { data, error } = await supabase
        .from('compliance_requirements')
        .upsert(payload, { onConflict: 'contractor_id,workspace_id' })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      const updatedReqs: ComplianceRequirement = {
        insuranceRequired: data.insurance_required ?? true,
        businessLicenseRequired: data.business_license_required ?? true,
        professionalLicenseRequired: data.professional_license_required ?? false,
        safetyDocumentationRequired: data.safety_documentation_required ?? false,
        taxDocumentationRequired: data.tax_documentation_required ?? true,
        workersCompRequired: data.workers_comp_required ?? true,
      };

      // Automatically recalculate and sync contractor compliance status
      await this.syncContractorStatus(workspaceId, contractorId);

      return { data: updatedReqs };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to update compliance requirements' };
    }
  },

  /**
   * Backward-compatibility helper for legacy callers.
   */
  calculateStatus(requirements: ComplianceRequirement, documents: Document[]): ComplianceStatus {
    const gateResult = this.evaluateCompliancePure(
      '',
      '',
      '',
      requirements,
      documents
    );
    return this.mapGateStatusToDbStatus(gateResult);
  },
};
