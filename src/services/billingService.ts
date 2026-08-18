import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PlanType } from '../types';

export interface UsageReport {
  contractors: {
    current: number;
    limit: number | null; // null = unlimited
    hasReachedLimit: boolean;
  };
  documents: {
    current: number;
    limit: number | null;
    hasReachedLimit: boolean;
  };
  aiExtractions: {
    current: number;
    limit: number | null;
    hasReachedLimit: boolean;
  };
}

export const billingService = {
  /**
   * Retrieves the current workspace subscription plan.
   * If none exists or Supabase is not configured, returns a default FREE plan state.
   */
  async getWorkspaceSubscription(workspaceId: string): Promise<{ plan: string; status: string; isTrial: boolean }> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return { plan: 'FREE', status: 'active', isTrial: false };
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error || !data) {
        return { plan: 'FREE', status: 'active', isTrial: false };
      }

      const now = new Date();
      const isTrial = data.trial_end && new Date(data.trial_end) > now;

      return {
        plan: data.plan || 'FREE',
        status: data.status || 'active',
        isTrial: !!isTrial
      };
    } catch {
      return { plan: 'FREE', status: 'active', isTrial: false };
    }
  },

  /**
   * Retrieves all canonical public plans with their entitlements.
   */
  async getPublicPlans() {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }
    
    try {
      const { data: plans } = await supabase
        .from('plans')
        .select('id, name, slug, description, price_per_month, active')
        .eq('active', true);
        
      if (!plans) return [];
      
      const { data: entitlements } = await supabase
        .from('plan_entitlements')
        .select('plan_id, feature, limit_value');
        
      return plans.map(plan => {
        const ents = (entitlements || []).filter(e => e.plan_id === plan.id);
        return {
          ...plan,
          contractors: ents.find(e => e.feature === 'max_contractors')?.limit_value ?? null,
          documents: ents.find(e => e.feature === 'max_documents')?.limit_value ?? null,
          aiExtractions: ents.find(e => e.feature === 'max_ai_extractions')?.limit_value ?? null,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Retrieves limits for a given plan slug from the `plan_entitlements` table.
   * Falls back to sensible defaults if the database query fails.
   */
  async getPlanLimits(planSlug: string) {
    const defaults: Record<string, { contractors: number; documents: number; aiExtractions: number }> = {
      'FREE': { contractors: 5, documents: 20, aiExtractions: 10 },
      'STARTER': { contractors: 25, documents: 100, aiExtractions: 50 },
      'PRO': { contractors: 100, documents: 500, aiExtractions: 250 },
      'BUSINESS': { contractors: 999999, documents: 999999, aiExtractions: 999999 }
    };
    
    const fallback = defaults[planSlug] || defaults['FREE'];

    if (!isSupabaseConfigured() || !supabase) {
      return fallback;
    }

    try {
      const { data: planData } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', planSlug)
        .maybeSingle();

      if (!planData) return fallback;

      const { data: entitlements } = await supabase
        .from('plan_entitlements')
        .select('feature, limit_value')
        .eq('plan_id', planData.id);

      if (!entitlements || entitlements.length === 0) return fallback;

      const getLimit = (feature: string, defaultVal: number) => {
        const ent = entitlements.find(e => e.feature === feature);
        if (!ent) return defaultVal;
        return ent.limit_value; // could be null for unlimited
      };

      return {
        contractors: getLimit('max_contractors', fallback.contractors),
        documents: getLimit('max_documents', fallback.documents),
        aiExtractions: getLimit('max_ai_extractions', fallback.aiExtractions)
      };
    } catch {
      return fallback;
    }
  },

  /**
   * Calculates actual workspace usage strictly from the database.
   */
  async getWorkspaceUsage(workspaceId: string): Promise<UsageReport> {
    if (!workspaceId || !isSupabaseConfigured() || !supabase) {
      return {
        contractors: { current: 0, limit: 5, hasReachedLimit: false },
        documents: { current: 0, limit: 20, hasReachedLimit: false },
        aiExtractions: { current: 0, limit: 10, hasReachedLimit: false }
      };
    }

    try {
      const sub = await this.getWorkspaceSubscription(workspaceId);
      const limits = await this.getPlanLimits(sub.plan);

      // 1. Get Contractor Count
      const { count: contractorCount } = await supabase
        .from('contractors')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // 2. Get Document Count
      const { count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      // 3. Get AI Extractions Count
      const { count: aiCount } = await supabase
        .from('document_extractions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      const cc = contractorCount || 0;
      const dc = documentCount || 0;
      const ac = aiCount || 0;

      return {
        contractors: {
          current: cc,
          limit: limits.contractors,
          hasReachedLimit: limits.contractors !== null && cc >= limits.contractors
        },
        documents: {
          current: dc,
          limit: limits.documents,
          hasReachedLimit: limits.documents !== null && dc >= limits.documents
        },
        aiExtractions: {
          current: ac,
          limit: limits.aiExtractions,
          hasReachedLimit: limits.aiExtractions !== null && ac >= limits.aiExtractions
        }
      };
    } catch {
      // Safe fallback on error
      return {
        contractors: { current: 0, limit: 5, hasReachedLimit: false },
        documents: { current: 0, limit: 20, hasReachedLimit: false },
        aiExtractions: { current: 0, limit: 10, hasReachedLimit: false }
      };
    }
  },

  async enforceContractorLimit(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getWorkspaceUsage(workspaceId);
    if (usage.contractors.hasReachedLimit) {
      return { allowed: false, reason: 'LIMIT_REACHED: Maximum contractor limit exceeded for current plan.' };
    }
    return { allowed: true };
  },

  async enforceDocumentLimit(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getWorkspaceUsage(workspaceId);
    if (usage.documents.hasReachedLimit) {
      return { allowed: false, reason: 'LIMIT_REACHED: Maximum document limit exceeded for current plan.' };
    }
    return { allowed: true };
  },

  async enforceAIExtractionLimit(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
    const usage = await this.getWorkspaceUsage(workspaceId);
    if (usage.aiExtractions.hasReachedLimit) {
      return { allowed: false, reason: 'LIMIT_REACHED: Maximum AI extraction limit exceeded for current plan.' };
    }
    return { allowed: true };
  }
};
