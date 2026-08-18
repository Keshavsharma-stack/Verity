export type ComplianceStatus = 'COMPLIANT' | 'EXPIRING' | 'NON_COMPLIANT' | 'PENDING_REVIEW';

export type ComplianceGateStatus = 'READY' | 'NOT_READY' | 'REVIEW_REQUIRED';

export type RequirementEvaluationStatus = 
  | 'SATISFIED' 
  | 'DEFICIENT' 
  | 'EXPIRED' 
  | 'MISSING' 
  | 'MANUAL_REVIEW_REQUIRED' 
  | 'EXPIRING';

export interface RequirementEvaluation {
  requirementId: string;
  name: string;
  required: boolean;
  status: RequirementEvaluationStatus;
  documentId?: string;
  documentName?: string;
  expiresAt?: string;
  daysRemaining?: number | null;
  reason?: string;
  extractedValue?: any;
  expectedThreshold?: any;
}

export interface ComplianceGateResult {
  status: ComplianceGateStatus;
  contractorId: string;
  workspaceId: string;
  requiredCount: number;
  validCount: number;
  expiringCount: number;
  expiredCount: number;
  missingCount: number;
  reviewRequiredCount: number;
  requirements: RequirementEvaluation[];
  evaluatedAt: string;
  lastReview?: {
    reviewedAt?: string;
    reviewedBy?: string;
    reason?: string;
  } | null;
  nextRequiredAction?: string | null;
}

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

export type ProcessingStatus = 
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'REVIEW_REQUIRED'
  | 'VERIFIED'
  | 'FAILED';

export interface ExtractedFieldEvidence<T = any> {
  value: T;
  confidence?: number;
  evidenceText?: string;
}

export interface ExtractedDocumentData {
  documentType?: ExtractedFieldEvidence<string>;
  documentNumber?: ExtractedFieldEvidence<string>;
  entityName?: ExtractedFieldEvidence<string>;
  policyNumber?: ExtractedFieldEvidence<string>;
  effectiveDate?: ExtractedFieldEvidence<string>;
  expirationDate?: ExtractedFieldEvidence<string>;
  carrierName?: ExtractedFieldEvidence<string>;
  coverageLimit?: ExtractedFieldEvidence<number>;
  additionalInsured?: ExtractedFieldEvidence<boolean>;
  waiverOfSubrogation?: ExtractedFieldEvidence<boolean>;
  licenseNumber?: ExtractedFieldEvidence<string>;
  licenseState?: ExtractedFieldEvidence<string>;
}

export interface RequirementCheckResult {
  requirementKey: string;
  requirementName: string;
  required: boolean;
  satisfied: boolean;
  extractedValue?: any;
  expectedThreshold?: any;
  status: 'SATISFIED' | 'DEFICIENT' | 'EXPIRED' | 'MISSING' | 'MANUAL_REVIEW_REQUIRED';
  notes?: string;
}

export interface DocumentExtraction {
  id: string;
  workspaceId: string;
  contractorId: string;
  documentId: string;
  documentTypeDetected?: string;
  rawExtractedJson: Record<string, any>;
  normalizedData: ExtractedDocumentData;
  evidenceData: Record<string, string>;
  requirementChecks: RequirementCheckResult[];
  status: 'EXTRACTED' | 'REVIEW_REQUIRED' | 'VERIFIED' | 'FAILED';
  modelUsed?: string;
  errorMessage?: string;
  createdAt: string;
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
  processingStatus?: ProcessingStatus;
  processingError?: string;
  processedAt?: string;
  extractedData?: ExtractedDocumentData;
  reviewReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
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

export type ExpirationStatusCategory = 
  | 'NO_EXPIRATION_DATE'
  | 'EXPIRED'
  | 'EXPIRING_7_DAYS'
  | 'EXPIRING_15_DAYS'
  | 'EXPIRING_30_DAYS'
  | 'ACTIVE';

export type ReminderCheckpoint = 
  | '30_DAYS'
  | '15_DAYS'
  | '7_DAYS'
  | '1_DAY'
  | 'EXPIRATION_DAY'
  | 'MANUAL_REQUEST'
  | 'COMPLIANCE_ACTION'
  | 'GATE_READY';

export type ReminderStatus = 
  | 'SCHEDULED' 
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'DISPATCHED';

export interface Reminder {
  id: string;
  workspaceId: string;
  contractorId: string;
  documentId?: string;
  checkpoint: ReminderCheckpoint;
  scheduledFor: string;
  sentAt?: string;
  status: ReminderStatus;
  recipientEmail?: string;
  errorMessage?: string;
  attemptCount?: number;
  createdAt: string;
}
