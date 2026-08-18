import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Document, DocumentType } from '../types';
import { complianceService } from './complianceService';
import { reminderService } from './reminderService';
import { evaluateExpiration } from '../lib/expiration';

export interface UploadDocumentInput {
  contractorId: string;
  name: string;
  type: DocumentType;
  file?: File | Blob;
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: string;
  status?: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING_REVIEW' | 'REJECTED';
}

export interface UpdateDocumentInput {
  name?: string;
  type?: DocumentType;
  expiresAt?: string;
  status?: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING_REVIEW' | 'REJECTED';
}

function mapDocumentFromDB(row: any): Document {
  let computedStatus = row.status;
  if (row.expires_at) {
    const exp = evaluateExpiration(row.expires_at);
    if (exp.isExpired) {
      computedStatus = 'EXPIRED';
    } else if (exp.isExpiringSoon && computedStatus === 'VALID') {
      computedStatus = 'EXPIRING';
    }
  }

  return {
    id: row.id,
    contractorId: row.contractor_id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.type as DocumentType,
    fileUrl: row.file_url,
    fileSize: row.file_size || 0,
    status: computedStatus,
    processingStatus: row.processing_status || 'UPLOADED',
    processingError: row.processing_error || undefined,
    processedAt: row.processed_at || undefined,
    extractedData: row.extracted_data || undefined,
    reviewReason: row.review_reason || undefined,
    verifiedAt: row.verified_at || undefined,
    verifiedBy: row.verified_by || undefined,
    uploadedAt: row.uploaded_at || row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || undefined,
  };
}

export const documentService = {
  /**
   * List all documents in a workspace, optionally filtered by contractorId.
   */
  async listDocuments(
    workspaceId: string,
    contractorId?: string
  ): Promise<{ data: Document[]; error?: string }> {
    if (!workspaceId) {
      return { data: [] };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: [] };
    }

    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('uploaded_at', { ascending: false });

      if (contractorId) {
        query = query.eq('contractor_id', contractorId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      const docs = (data || []).map(mapDocumentFromDB);
      return { data: docs };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to list documents' };
    }
  },

  /**
   * Get a single document record by ID within workspace.
   */
  async getDocumentById(
    workspaceId: string,
    documentId: string
  ): Promise<{ data: Document | null; error?: string }> {
    if (!workspaceId || !documentId) {
      return { data: null };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: null };
      }

      return { data: mapDocumentFromDB(data) };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to get document' };
    }
  },

  /**
   * Upload a new document with file storage and database metadata.
   */
  async uploadDocument(
    workspaceId: string,
    input: UploadDocumentInput
  ): Promise<{ data: Document | null; error?: string }> {
    if (!workspaceId || !input.contractorId) {
      return { data: null, error: 'Workspace ID and Contractor ID are required' };
    }

    if (!input.name?.trim()) {
      return { data: null, error: 'Document name is required' };
    }

    if (!input.type) {
      return { data: null, error: 'Document type is required' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      // 0. Enforce billing limits
      const { billingService } = await import('./billingService');
      const limitCheck = await billingService.enforceDocumentLimit(workspaceId);
      if (!limitCheck.allowed) {
        return { data: null, error: limitCheck.reason };
      }

      let finalFileUrl = input.fileUrl || '';
      let calculatedSize = input.fileSize || 0;

      // 1. Upload to Supabase Storage if File is provided
      if (input.file) {
        calculatedSize = input.file.size;
        const sanitizedName = input.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `workspace/${workspaceId}/contractors/${input.contractorId}/${Date.now()}_${sanitizedName}`;

        try {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, input.file, {
              cacheControl: '3600',
              upsert: true,
            });

          if (!storageError) {
            finalFileUrl = storagePath;
          } else {
            finalFileUrl = storagePath;
          }
        } catch {
          finalFileUrl = storagePath;
        }
      }

      if (!finalFileUrl) {
        finalFileUrl = `workspace/${workspaceId}/contractors/${input.contractorId}/doc_${Date.now()}`;
      }

      // Initial status determination based on centralized expiration
      let docStatus = input.status || 'VALID';
      if (input.expiresAt) {
        const exp = evaluateExpiration(input.expiresAt);
        if (exp.isExpired) {
          docStatus = 'EXPIRED';
        } else if (exp.isExpiringSoon) {
          docStatus = 'EXPIRING';
        }
      }

      // 2. Insert document record into Supabase database
      const { data: insertedRow, error: insertError } = await supabase
        .from('documents')
        .insert({
          workspace_id: workspaceId,
          contractor_id: input.contractorId,
          name: input.name.trim(),
          type: input.type,
          file_url: finalFileUrl,
          file_size: calculatedSize,
          status: docStatus,
          expires_at: input.expiresAt || null,
        })
        .select()
        .single();

      if (insertError || !insertedRow) {
        return { data: null, error: insertError?.message || 'Failed to record document metadata' };
      }

      const doc = mapDocumentFromDB(insertedRow);

      // 3. Log Activity
      try {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contractor_id: input.contractorId,
          document_id: doc.id,
          action: 'DOCUMENT_UPLOADED',
          description: `Uploaded ${doc.name} (${doc.type.replace(/_/g, ' ')})`,
        });
      } catch {
        // Ignore
      }

      // 4. Auto-generate Reminder Checkpoints
      if (doc.expiresAt) {
        await reminderService.generateRemindersForDocument(workspaceId, doc);
      }

      // 5. Auto-synchronize contractor compliance status
      await complianceService.syncContractorStatus(workspaceId, input.contractorId);

      return { data: doc };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to complete document upload' };
    }
  },

  /**
   * Update document metadata or expiration.
   */
  async updateDocument(
    workspaceId: string,
    documentId: string,
    input: UpdateDocumentInput
  ): Promise<{ data: Document | null; error?: string }> {
    if (!workspaceId || !documentId) {
      return { data: null, error: 'Workspace ID and Document ID are required' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      const updatePayload: any = {};
      if (input.name !== undefined) updatePayload.name = input.name.trim();
      if (input.type !== undefined) updatePayload.type = input.type;
      if (input.expiresAt !== undefined) updatePayload.expires_at = input.expiresAt || null;
      if (input.status !== undefined) updatePayload.status = input.status;

      const { data, error } = await supabase
        .from('documents')
        .update(updatePayload)
        .eq('id', documentId)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error || !data) {
        return { data: null, error: error?.message || 'Failed to update document' };
      }

      const doc = mapDocumentFromDB(data);

      // Log Activity
      try {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contractor_id: doc.contractorId,
          document_id: doc.id,
          action: 'DOCUMENT_UPDATED',
          description: `Updated document ${doc.name}`,
        });
      } catch {
        // Ignore
      }

      // Update/reschedule reminders if expiration changed
      if (doc.expiresAt) {
        await reminderService.generateRemindersForDocument(workspaceId, doc);
      }

      // Sync contractor compliance status
      await complianceService.syncContractorStatus(workspaceId, doc.contractorId);

      return { data: doc };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to update document' };
    }
  },

  /**
   * Delete a document and its storage file.
   */
  async deleteDocument(
    workspaceId: string,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!workspaceId || !documentId) {
      return { success: false, error: 'Workspace ID and Document ID are required' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      // 1. Fetch document to get file_url and contractor_id
      const { data: docRow } = await supabase
        .from('documents')
        .select('file_url, contractor_id, name')
        .eq('id', documentId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      // 2. Delete storage file if path exists
      if (docRow?.file_url && docRow.file_url.startsWith('workspace/')) {
        try {
          await supabase.storage.from('documents').remove([docRow.file_url]);
        } catch {
          // Ignore
        }
      }

      // 3. Delete DB record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('workspace_id', workspaceId);

      if (error) {
        return { success: false, error: error.message };
      }

      // 4. Log Activity
      if (docRow) {
        try {
          await supabase.from('activities').insert({
            workspace_id: workspaceId,
            contractor_id: docRow.contractor_id,
            action: 'DOCUMENT_DELETED',
            description: `Deleted document ${docRow.name}`,
          });
        } catch {
          // Ignore
        }

        // 5. Sync contractor compliance status
        if (docRow.contractor_id) {
          await complianceService.syncContractorStatus(workspaceId, docRow.contractor_id);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete document' };
    }
  },

  /**
   * Get expiring documents across the workspace using centralized evaluation.
   */
  async getExpiringDocuments(
    workspaceId: string,
    daysThreshold: number = 30
  ): Promise<{ data: Document[]; error?: string }> {
    const res = await this.listDocuments(workspaceId);
    if (res.error) {
      return { data: [], error: res.error };
    }

    const expiring = res.data.filter(doc => {
      if (!doc.expiresAt) return false;
      const exp = evaluateExpiration(doc.expiresAt);
      return !exp.isExpired && exp.daysRemaining !== null && exp.daysRemaining <= daysThreshold;
    });

    return { data: expiring };
  },

  /**
   * Get expired documents across the workspace using centralized evaluation.
   */
  async getExpiredDocuments(workspaceId: string): Promise<{ data: Document[]; error?: string }> {
    const res = await this.listDocuments(workspaceId);
    if (res.error) {
      return { data: [], error: res.error };
    }

    const expired = res.data.filter(doc => {
      if (doc.status === 'EXPIRED') return true;
      if (!doc.expiresAt) return false;
      const exp = evaluateExpiration(doc.expiresAt);
      return exp.isExpired;
    });

    return { data: expired };
  },

  /**
   * Generate secure download or viewing URL.
   */
  async getDocumentDownloadUrl(
    workspaceId: string,
    document: Document
  ): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) {
      return document.fileUrl;
    }

    if (document.fileUrl.startsWith('workspace/')) {
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.fileUrl, 3600);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch {
        // Fall back to direct url
      }
    }

    return document.fileUrl;
  },
};
