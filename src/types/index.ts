export type ComplianceStatus = 'COMPLIANT' | 'EXPIRING' | 'NON_COMPLIANT' | 'PENDING_REVIEW';

export type DocumentType = 
  | 'CERTIFICATE_OF_INSURANCE'
  | 'BUSINESS_LICENSE'
  | 'PROFESSIONAL_LICENSE'
  | 'SAFETY_CERTIFICATE'
  | 'W9'
  | 'TAX_DOCUMENT'
  | 'WORKERS_COMPENSATION'
  | 'GENERAL_LIABILITY'
  | 'AUTO_INSURANCE'
  | 'OTHER';

export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface Plan {
  id: string;
  name: PlanType;
  maxContractors: number;
  maxDocuments: number;
  maxTeamMembers: number;
  advancedReporting: boolean;
  automation: boolean;
  customRequirements: boolean;
  pricePerMonth: number;
}

export interface Workspace {
  id: string;
  name: string;
  plan?: PlanType;
  ownerId?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  companyName?: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Contractor {
  id: string;
  workspaceId: string;
  companyName: string;
  primaryContact: string;
  email: string;
  phone: string;
  address: string;
  contractorType: string; // e.g., 'Subcontractor', 'Independent Contractor'
  trade: string; // e.g., 'Electrical', 'Plumbing'
  notes?: string;
  status: ComplianceStatus;
  joinedAt: string;
  lastUpdated: string;
  requirements: ComplianceRequirement;
}

export interface ComplianceRequirement {
  insuranceRequired: boolean;
  businessLicenseRequired: boolean;
  professionalLicenseRequired: boolean;
  safetyDocumentationRequired: boolean;
  taxDocumentationRequired: boolean;
  workersCompRequired: boolean;
}

export interface Document {
  id: string;
  contractorId: string;
  workspaceId: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  expiresAt?: string;
  status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING_REVIEW' | 'REJECTED';
}

export interface Activity {
  id: string;
  workspaceId: string;
  contractorId?: string;
  documentId?: string;
  userId: string;
  action: string;
  description: string;
  createdAt: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  user: User;
  expiresAt?: number;
}
