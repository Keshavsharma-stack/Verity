import { Contractor, Document, Activity, Workspace, User, Plan, ComplianceStatus } from '../types';
import { addDays, subDays } from 'date-fns';

const today = new Date();

export const PLANS: Record<string, Plan> = {
  FREE: { id: 'plan_1', name: 'FREE', maxContractors: 5, maxDocuments: 20, maxTeamMembers: 1, advancedReporting: false, automation: false, customRequirements: false, pricePerMonth: 0 },
  STARTER: { id: 'plan_2', name: 'STARTER', maxContractors: 50, maxDocuments: 500, maxTeamMembers: 3, advancedReporting: false, automation: false, customRequirements: false, pricePerMonth: 49 },
  PRO: { id: 'plan_3', name: 'PRO', maxContractors: 250, maxDocuments: 2500, maxTeamMembers: 10, advancedReporting: true, automation: true, customRequirements: false, pricePerMonth: 149 },
  BUSINESS: { id: 'plan_4', name: 'BUSINESS', maxContractors: 9999, maxDocuments: 99999, maxTeamMembers: 50, advancedReporting: true, automation: true, customRequirements: true, pricePerMonth: 399 },
};

export const MOCK_WORKSPACE: Workspace = {
  id: 'ws_1',
  name: 'Acme Construction',
  plan: 'PRO',
  createdAt: subDays(today, 365).toISOString(),
};

export const MOCK_USER: User = {
  id: 'usr_1',
  email: 'admin@acmeconstruction.com',
  name: 'Sarah Connor',
  workspaceId: 'ws_1',
  role: 'ADMIN',
};

export const MOCK_CONTRACTORS: Contractor[] = [
  {
    id: 'con_1',
    workspaceId: 'ws_1',
    companyName: 'Apex Electrical Services',
    primaryContact: 'Michael Chang',
    email: 'michael@apexelectrical.com',
    phone: '(555) 123-4567',
    address: '123 Power Ln, Austin, TX 78701',
    contractorType: 'Subcontractor',
    trade: 'Electrical',
    status: 'COMPLIANT',
    joinedAt: subDays(today, 120).toISOString(),
    lastUpdated: subDays(today, 2).toISOString(),
    requirements: {
      insuranceRequired: true,
      businessLicenseRequired: true,
      professionalLicenseRequired: true,
      safetyDocumentationRequired: true,
      taxDocumentationRequired: true,
      workersCompRequired: true,
    }
  },
  {
    id: 'con_2',
    workspaceId: 'ws_1',
    companyName: 'Solid Foundations LLC',
    primaryContact: 'David Miller',
    email: 'david@solidfoundations.co',
    phone: '(555) 987-6543',
    address: '456 Concrete Blvd, Austin, TX 78704',
    contractorType: 'Subcontractor',
    trade: 'Concrete',
    status: 'EXPIRING',
    joinedAt: subDays(today, 200).toISOString(),
    lastUpdated: subDays(today, 5).toISOString(),
    requirements: {
      insuranceRequired: true,
      businessLicenseRequired: true,
      professionalLicenseRequired: false,
      safetyDocumentationRequired: true,
      taxDocumentationRequired: true,
      workersCompRequired: true,
    }
  },
  {
    id: 'con_3',
    workspaceId: 'ws_1',
    companyName: 'Skyline Plumbing',
    primaryContact: 'Jessica Rivera',
    email: 'jessica@skylineplumbing.com',
    phone: '(555) 234-5678',
    address: '789 Water Way, Austin, TX 78705',
    contractorType: 'Subcontractor',
    trade: 'Plumbing',
    status: 'NON_COMPLIANT',
    joinedAt: subDays(today, 30).toISOString(),
    lastUpdated: subDays(today, 30).toISOString(),
    requirements: {
      insuranceRequired: true,
      businessLicenseRequired: true,
      professionalLicenseRequired: true,
      safetyDocumentationRequired: false,
      taxDocumentationRequired: true,
      workersCompRequired: true,
    }
  },
  {
    id: 'con_4',
    workspaceId: 'ws_1',
    companyName: 'Elite HVAC & Cooling',
    primaryContact: 'Robert Frost',
    email: 'robert@elitehvac.com',
    phone: '(555) 345-6789',
    address: '321 Breeze St, Austin, TX 78723',
    contractorType: 'Subcontractor',
    trade: 'HVAC',
    status: 'PENDING_REVIEW',
    joinedAt: subDays(today, 2).toISOString(),
    lastUpdated: subDays(today, 1).toISOString(),
    requirements: {
      insuranceRequired: true,
      businessLicenseRequired: true,
      professionalLicenseRequired: true,
      safetyDocumentationRequired: true,
      taxDocumentationRequired: true,
      workersCompRequired: true,
    }
  }
];

export const MOCK_DOCUMENTS: Document[] = [
  // Apex Electrical - Compliant
  {
    id: 'doc_1', contractorId: 'con_1', workspaceId: 'ws_1',
    name: 'General Liability Insurance 2024', type: 'GENERAL_LIABILITY',
    fileUrl: '#', fileSize: 1024 * 1024 * 2.5,
    uploadedAt: subDays(today, 100).toISOString(),
    expiresAt: addDays(today, 260).toISOString(),
    status: 'VALID'
  },
  {
    id: 'doc_2', contractorId: 'con_1', workspaceId: 'ws_1',
    name: 'Master Electrician License', type: 'PROFESSIONAL_LICENSE',
    fileUrl: '#', fileSize: 1024 * 500,
    uploadedAt: subDays(today, 120).toISOString(),
    expiresAt: addDays(today, 400).toISOString(),
    status: 'VALID'
  },
  // Solid Foundations - Expiring
  {
    id: 'doc_3', contractorId: 'con_2', workspaceId: 'ws_1',
    name: 'Workers Compensation Certificate', type: 'WORKERS_COMPENSATION',
    fileUrl: '#', fileSize: 1024 * 1024 * 1.2,
    uploadedAt: subDays(today, 180).toISOString(),
    expiresAt: addDays(today, 12).toISOString(), // Expiring soon
    status: 'EXPIRING'
  },
  {
    id: 'doc_4', contractorId: 'con_2', workspaceId: 'ws_1',
    name: 'Business License', type: 'BUSINESS_LICENSE',
    fileUrl: '#', fileSize: 1024 * 800,
    uploadedAt: subDays(today, 200).toISOString(),
    expiresAt: addDays(today, 150).toISOString(),
    status: 'VALID'
  },
  // Skyline Plumbing - Non Compliant
  {
    id: 'doc_5', contractorId: 'con_3', workspaceId: 'ws_1',
    name: 'General Liability (Expired)', type: 'GENERAL_LIABILITY',
    fileUrl: '#', fileSize: 1024 * 1024 * 3,
    uploadedAt: subDays(today, 30).toISOString(),
    expiresAt: subDays(today, 5).toISOString(), // Expired
    status: 'EXPIRED'
  },
  // Elite HVAC - Pending Review
  {
    id: 'doc_6', contractorId: 'con_4', workspaceId: 'ws_1',
    name: 'W-9 Form 2024', type: 'W9',
    fileUrl: '#', fileSize: 1024 * 300,
    uploadedAt: subDays(today, 1).toISOString(),
    status: 'PENDING_REVIEW'
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 'act_1', workspaceId: 'ws_1', userId: 'usr_1', contractorId: 'con_4', action: 'CONTRACTOR_ADDED', description: 'Added Elite HVAC & Cooling', createdAt: subDays(today, 2).toISOString() },
  { id: 'act_2', workspaceId: 'ws_1', userId: 'usr_1', contractorId: 'con_4', documentId: 'doc_6', action: 'DOCUMENT_UPLOADED', description: 'Uploaded W-9 Form 2024 for Elite HVAC & Cooling', createdAt: subDays(today, 1).toISOString() },
  { id: 'act_3', workspaceId: 'ws_1', userId: 'usr_1', contractorId: 'con_1', documentId: 'doc_1', action: 'DOCUMENT_APPROVED', description: 'Approved General Liability Insurance 2024 for Apex Electrical', createdAt: subDays(today, 98).toISOString() },
];
