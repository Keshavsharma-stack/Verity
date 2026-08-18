import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Contractor, ComplianceRequirement, ComplianceStatus } from '../types';

export interface CreateContractorInput {
  companyName: string;
  primaryContact: string;
  email: string;
  phone?: string;
  address?: string;
  contractorType?: string;
  trade: string;
  notes?: string;
  requirements?: Partial<ComplianceRequirement>;
}

export interface UpdateContractorInput {
  companyName?: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  address?: string;
  contractorType?: string;
  trade?: string;
  notes?: string;
  status?: ComplianceStatus;
  requirements?: Partial<ComplianceRequirement>;
}

const DEFAULT_REQUIREMENTS: ComplianceRequirement = {
  insuranceRequired: true,
  businessLicenseRequired: true,
  professionalLicenseRequired: false,
  safetyDocumentationRequired: false,
  taxDocumentationRequired: true,
  workersCompRequired: true,
};

function mapContractorFromDB(row: any, reqRow?: any): Contractor {
  const reqs: ComplianceRequirement = reqRow
    ? {
        insuranceRequired: reqRow.insurance_required ?? true,
        businessLicenseRequired: reqRow.business_license_required ?? true,
        professionalLicenseRequired: reqRow.professional_license_required ?? false,
        safetyDocumentationRequired: reqRow.safety_documentation_required ?? false,
        taxDocumentationRequired: reqRow.tax_documentation_required ?? true,
        workersCompRequired: reqRow.workers_comp_required ?? true,
      }
    : DEFAULT_REQUIREMENTS;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    companyName: row.company_name,
    primaryContact: row.primary_contact,
    email: row.email,
    phone: row.phone || '',
    address: row.address || '',
    contractorType: row.contractor_type || 'Subcontractor',
    trade: row.trade || 'General',
    notes: row.notes || '',
    status: (row.status as ComplianceStatus) || 'PENDING_REVIEW',
    joinedAt: row.joined_at || row.created_at || new Date().toISOString(),
    lastUpdated: row.last_updated || new Date().toISOString(),
    requirements: reqs,
  };
}

export const contractorService = {
  /**
   * List all contractors for a specific workspace from Supabase.
   */
  async listContractors(workspaceId: string): Promise<{ data: Contractor[]; error?: string }> {
    if (!workspaceId) {
      return { data: [] };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: [], error: 'Supabase client is not configured' };
    }

    try {
      // Fetch contractors with their compliance requirements
      const { data: contractorsData, error: conError } = await supabase
        .from('contractors')
        .select(`
          *,
          compliance_requirements (*)
        `)
        .eq('workspace_id', workspaceId)
        .order('company_name', { ascending: true });

      if (conError) {
        return { data: [], error: conError.message };
      }

      const contractors: Contractor[] = (contractorsData || []).map((row: any) => {
        const reqRow = Array.isArray(row.compliance_requirements)
          ? row.compliance_requirements[0]
          : row.compliance_requirements;
        return mapContractorFromDB(row, reqRow);
      });

      return { data: contractors };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch contractors' };
    }
  },

  /**
   * Get a single contractor by ID within a workspace.
   */
  async getContractorById(workspaceId: string, contractorId: string): Promise<{ data: Contractor | null; error?: string }> {
    if (!workspaceId || !contractorId) {
      return { data: null };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      const { data: row, error } = await supabase
        .from('contractors')
        .select(`
          *,
          compliance_requirements (*)
        `)
        .eq('id', contractorId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }

      if (!row) {
        return { data: null };
      }

      const reqRow = Array.isArray(row.compliance_requirements)
        ? row.compliance_requirements[0]
        : row.compliance_requirements;

      return { data: mapContractorFromDB(row, reqRow) };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to fetch contractor' };
    }
  },

  /**
   * Create a new contractor in Supabase scoped to workspace_id.
   */
  async createContractor(workspaceId: string, input: CreateContractorInput): Promise<{ data: Contractor | null; error?: string }> {
    if (!workspaceId) {
      return { data: null, error: 'Active workspace ID is required' };
    }

    if (!input.companyName?.trim()) {
      return { data: null, error: 'Company name is required' };
    }

    if (!input.trade?.trim()) {
      return { data: null, error: 'Trade is required' };
    }

    if (!input.primaryContact?.trim()) {
      return { data: null, error: 'Primary contact name is required' };
    }

    if (!input.email?.trim()) {
      return { data: null, error: 'Email address is required' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      // 0. Enforce billing limits
      const { billingService } = await import('./billingService');
      const limitCheck = await billingService.enforceContractorLimit(workspaceId);
      if (!limitCheck.allowed) {
        return { data: null, error: limitCheck.reason };
      }

      // 1. Insert Contractor Record
      const { data: insertedRow, error: insertError } = await supabase
        .from('contractors')
        .insert({
          workspace_id: workspaceId,
          company_name: input.companyName.trim(),
          primary_contact: input.primaryContact.trim(),
          email: input.email.trim(),
          phone: input.phone?.trim() || null,
          address: input.address?.trim() || null,
          contractor_type: input.contractorType || 'Subcontractor',
          trade: input.trade.trim(),
          notes: input.notes?.trim() || null,
          status: 'PENDING_REVIEW',
        })
        .select()
        .single();

      if (insertError || !insertedRow) {
        return { data: null, error: insertError?.message || 'Failed to create contractor record' };
      }

      // 2. Insert Compliance Requirements
      const reqs = {
        ...DEFAULT_REQUIREMENTS,
        ...input.requirements,
      };

      const { data: insertedReqs, error: reqError } = await supabase
        .from('compliance_requirements')
        .insert({
          contractor_id: insertedRow.id,
          workspace_id: workspaceId,
          insurance_required: reqs.insuranceRequired,
          business_license_required: reqs.businessLicenseRequired,
          professional_license_required: reqs.professionalLicenseRequired,
          safety_documentation_required: reqs.safetyDocumentationRequired,
          tax_documentation_required: reqs.taxDocumentationRequired,
          workers_comp_required: reqs.workersCompRequired,
        })
        .select()
        .maybeSingle();

      // 3. Log Activity (Best-effort audit log)
      try {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contractor_id: insertedRow.id,
          action: 'CONTRACTOR_CREATED',
          description: `Added contractor ${insertedRow.company_name} (${insertedRow.trade})`,
        });
      } catch {
        // Activity log failures shouldn't block contractor creation
      }

      return { data: mapContractorFromDB(insertedRow, insertedReqs || reqs) };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Unable to register contractor' };
    }
  },

  /**
   * Update an existing contractor and their compliance requirements.
   */
  async updateContractor(
    workspaceId: string,
    contractorId: string,
    input: UpdateContractorInput
  ): Promise<{ data: Contractor | null; error?: string }> {
    if (!workspaceId || !contractorId) {
      return { data: null, error: 'Workspace ID and Contractor ID are required' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: 'Supabase client is not configured' };
    }

    try {
      const updatePayload: any = {
        last_updated: new Date().toISOString(),
      };

      if (input.companyName !== undefined) updatePayload.company_name = input.companyName.trim();
      if (input.primaryContact !== undefined) updatePayload.primary_contact = input.primaryContact.trim();
      if (input.email !== undefined) updatePayload.email = input.email.trim();
      if (input.phone !== undefined) updatePayload.phone = input.phone.trim();
      if (input.address !== undefined) updatePayload.address = input.address.trim();
      if (input.contractorType !== undefined) updatePayload.contractor_type = input.contractorType;
      if (input.trade !== undefined) updatePayload.trade = input.trade.trim();
      if (input.notes !== undefined) updatePayload.notes = input.notes.trim();
      if (input.status !== undefined) updatePayload.status = input.status;

      // 1. Update Contractor Row
      const { data: updatedRow, error: updateError } = await supabase
        .from('contractors')
        .update(updatePayload)
        .eq('id', contractorId)
        .eq('workspace_id', workspaceId)
        .select()
        .single();

      if (updateError || !updatedRow) {
        return { data: null, error: updateError?.message || 'Failed to update contractor' };
      }

      // 2. Update or Upsert Compliance Requirements if provided
      let currentReqs = null;
      if (input.requirements) {
        const reqPayload: any = {
          contractor_id: contractorId,
          workspace_id: workspaceId,
        };
        if (input.requirements.insuranceRequired !== undefined) reqPayload.insurance_required = input.requirements.insuranceRequired;
        if (input.requirements.businessLicenseRequired !== undefined) reqPayload.business_license_required = input.requirements.businessLicenseRequired;
        if (input.requirements.professionalLicenseRequired !== undefined) reqPayload.professional_license_required = input.requirements.professionalLicenseRequired;
        if (input.requirements.safetyDocumentationRequired !== undefined) reqPayload.safety_documentation_required = input.requirements.safetyDocumentationRequired;
        if (input.requirements.taxDocumentationRequired !== undefined) reqPayload.tax_documentation_required = input.requirements.taxDocumentationRequired;
        if (input.requirements.workersCompRequired !== undefined) reqPayload.workers_comp_required = input.requirements.workersCompRequired;

        const { data: upsertedReqs } = await supabase
          .from('compliance_requirements')
          .upsert(reqPayload, { onConflict: 'contractor_id,workspace_id' })
          .select()
          .maybeSingle();

        currentReqs = upsertedReqs;
      }

      // 3. Log Activity
      try {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contractor_id: contractorId,
          action: 'CONTRACTOR_UPDATED',
          description: `Updated contractor profile for ${updatedRow.company_name}`,
        });
      } catch {
        // Ignore
      }

      return { data: mapContractorFromDB(updatedRow, currentReqs) };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Unable to update contractor' };
    }
  },

  /**
   * Delete a contractor record from Supabase.
   */
  async deleteContractor(workspaceId: string, contractorId: string): Promise<{ success: boolean; error?: string }> {
    if (!workspaceId || !contractorId) {
      return { success: false, error: 'Workspace ID and Contractor ID are required' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', contractorId)
        .eq('workspace_id', workspaceId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log Activity
      try {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          action: 'CONTRACTOR_DELETED',
          description: `Deleted contractor ID ${contractorId}`,
        });
      } catch {
        // Ignore
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete contractor' };
    }
  }
};
