import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Document, DocumentExtraction, ProcessingStatus } from '../types';
import { complianceService } from './complianceService';

export interface ProcessExtractionResponse {
  success: boolean;
  document?: Document;
  extraction?: DocumentExtraction;
  processingStatus: ProcessingStatus;
  error?: string;
}

export const aiDocumentService = {
  /**
   * Request server-side AI OCR and compliance extraction for a document.
   */
  async processDocumentExtraction(
    workspaceId: string,
    contractorId: string,
    documentId: string
  ): Promise<ProcessExtractionResponse> {
    if (!workspaceId || !contractorId || !documentId) {
      return {
        success: false,
        processingStatus: 'FAILED',
        error: 'Missing required IDs for processing',
      };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        processingStatus: 'FAILED',
        error: 'Supabase client is not configured',
      };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        return {
          success: false,
          processingStatus: 'FAILED',
          error: 'User authentication session not found',
        };
      }

      const response = await fetch('/api/documents/process-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          contractorId,
          documentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          processingStatus: data.processingStatus || 'FAILED',
          error: data.error || 'Document intelligence processing failed',
        };
      }

      // Sync contractor compliance status after extraction
      await complianceService.syncContractorStatus(workspaceId, contractorId);

      return {
        success: true,
        document: data.document,
        extraction: data.extraction,
        processingStatus: data.processingStatus || 'EXTRACTED',
      };
    } catch (err: any) {
      return {
        success: false,
        processingStatus: 'FAILED',
        error: err?.message || 'Network error communicating with AI intelligence service',
      };
    }
  },

  /**
   * Fetch extraction history and evidence for a specific document.
   */
  async getDocumentExtraction(
    workspaceId: string,
    documentId: string
  ): Promise<{ data: DocumentExtraction | null; error?: string }> {
    if (!workspaceId || !documentId || !isSupabaseConfigured() || !supabase) {
      return { data: null };
    }

    try {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('document_id', documentId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: null };
      }

      const extraction: DocumentExtraction = {
        id: data.id,
        workspaceId: data.workspace_id,
        contractorId: data.contractor_id,
        documentId: data.document_id,
        documentTypeDetected: data.document_type_detected,
        rawExtractedJson: data.raw_extracted_json || {},
        normalizedData: data.normalized_data || {},
        evidenceData: data.evidence_data || {},
        requirementChecks: data.requirement_checks || [],
        status: data.status,
        modelUsed: data.model_used,
        errorMessage: data.error_message,
        createdAt: data.created_at,
      };

      return { data: extraction };
    } catch (err: any) {
      return { data: null, error: err?.message };
    }
  },

  /**
   * Submit manual human verification / review decision for a document.
   */
  async submitManualVerification(
    workspaceId: string,
    contractorId: string,
    documentId: string,
    status: 'VERIFIED' | 'REVIEW_REQUIRED' | 'FAILED',
    reviewReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!workspaceId || !documentId || !isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Parameters missing' };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch('/api/documents/verify-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          contractorId,
          documentId,
          status,
          reviewReason,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to submit manual review' };
      }

      await complianceService.syncContractorStatus(workspaceId, contractorId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to submit verification' };
    }
  },
};
