import { Contractor, Document, ComplianceStatus } from '../types';
import { MOCK_CONTRACTORS, MOCK_DOCUMENTS } from '../data/mockData';
import { getDaysRemaining } from '../lib/utils';

// These abstract services represent what will eventually call Supabase.
// For now, they resolve with mock data to keep UI separate from data source.

export const contractorService = {
  async getContractors(): Promise<Contractor[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_CONTRACTORS]), 400));
  },
  
  async getContractorById(id: string): Promise<Contractor | undefined> {
    return new Promise((resolve) => setTimeout(() => {
      resolve(MOCK_CONTRACTORS.find(c => c.id === id));
    }, 300));
  },

  async addContractor(contractor: Omit<Contractor, 'id' | 'workspaceId' | 'status' | 'joinedAt' | 'lastUpdated'>): Promise<Contractor> {
    const newContractor: Contractor = {
      ...contractor,
      id: `con_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: 'ws_1',
      status: 'PENDING_REVIEW',
      joinedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    MOCK_CONTRACTORS.push(newContractor);
    return new Promise((resolve) => setTimeout(() => resolve(newContractor), 500));
  }
};

export const documentService = {
  async getDocuments(): Promise<Document[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_DOCUMENTS]), 400));
  },

  async getDocumentsByContractor(contractorId: string): Promise<Document[]> {
    return new Promise((resolve) => setTimeout(() => {
      resolve(MOCK_DOCUMENTS.filter(d => d.contractorId === contractorId));
    }, 300));
  },
  
  async getExpiringDocuments(daysThreshold: number = 30): Promise<Document[]> {
    return new Promise((resolve) => setTimeout(() => {
      const expiring = MOCK_DOCUMENTS.filter(d => {
        if (!d.expiresAt) return false;
        const daysRemaining = getDaysRemaining(d.expiresAt);
        return daysRemaining >= 0 && daysRemaining <= daysThreshold;
      });
      resolve(expiring);
    }, 300));
  },

  async getExpiredDocuments(): Promise<Document[]> {
    return new Promise((resolve) => setTimeout(() => {
      const expired = MOCK_DOCUMENTS.filter(d => {
        if (!d.expiresAt) return false;
        const daysRemaining = getDaysRemaining(d.expiresAt);
        return daysRemaining < 0;
      });
      resolve(expired);
    }, 300));
  }
};

export const complianceService = {
  calculateStatus(contractor: Contractor, documents: Document[]): ComplianceStatus {
    let hasExpired = false;
    let hasExpiring = false;
    
    // Simplistic mock logic: 
    // If any document is expired -> NON_COMPLIANT
    // If any is expiring within 30 days -> EXPIRING
    // If all required are valid -> COMPLIANT
    // If missing requirements -> NON_COMPLIANT
    // (A real robust logic would check specific required document types against uploaded ones)

    for (const doc of documents) {
      if (doc.status === 'EXPIRED') hasExpired = true;
      if (doc.status === 'EXPIRING') hasExpiring = true;
      if (doc.expiresAt) {
        const remaining = getDaysRemaining(doc.expiresAt);
        if (remaining < 0) hasExpired = true;
        if (remaining >= 0 && remaining <= 30) hasExpiring = true;
      }
    }

    if (hasExpired) return 'NON_COMPLIANT';
    if (hasExpiring) return 'EXPIRING';
    
    // Fake logic for missing required documents
    const requiredTypes = [];
    if (contractor.requirements.insuranceRequired) requiredTypes.push('GENERAL_LIABILITY');
    if (contractor.requirements.workersCompRequired) requiredTypes.push('WORKERS_COMPENSATION');
    
    let missingDocs = false;
    for (const type of requiredTypes) {
      if (!documents.find(d => d.type === type && (d.status === 'VALID' || d.status === 'EXPIRING'))) {
        missingDocs = true;
      }
    }

    if (missingDocs) return 'NON_COMPLIANT';

    return 'COMPLIANT';
  }
};
