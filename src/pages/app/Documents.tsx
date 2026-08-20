import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Label } from '../../components/ui/Input';
import { 
  Search, 
  Upload, 
  Filter, 
  Download, 
  Trash2, 
  FileText, 
  Loader2, 
  X, 
  AlertCircle, 
  Check, 
  FileCheck,
  Building2,
  Sparkles,
  ShieldCheck,
  XCircle,
  Clock,
  Info
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { contractorService } from '../../services/contractorService';
import { aiDocumentService } from '../../services/aiDocumentService';
import { authService } from '../../services/authService';
import { Document, Contractor, DocumentType, DocumentExtraction } from '../../types';
import { formatDate, checkEntityMatch } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  GENERAL_LIABILITY: 'General Liability Insurance ($2M)',
  WORKERS_COMPENSATION: 'Workers Compensation Policy',
  BUSINESS_LICENSE: 'State Business License',
  PROFESSIONAL_LICENSE: 'Professional Trade License',
  W9: 'Taxpayer Identification (W-9 Form)',
  TAX_DOCUMENT: 'Tax Document',
  SAFETY_CERTIFICATE: 'OSHA / Safety Certification',
  CERTIFICATE_OF_INSURANCE: 'Certificate of Insurance (COI)',
  AUTO_INSURANCE: 'Commercial Auto Policy',
  OTHER: 'Other Agreement / Endorsement',
};

export function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAIStatus, setSelectedAIStatus] = useState<string>('ALL');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);

  // Inspection Modal State
  const [inspectingDoc, setInspectingDoc] = useState<Document | null>(null);
  const [inspectingExtraction, setInspectingExtraction] = useState<DocumentExtraction | null>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [manualReviewReason, setManualReviewReason] = useState('');

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadContractorId, setUploadContractorId] = useState('');
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('GENERAL_LIABILITY');
  const [uploadExpiresAt, setUploadExpiresAt] = useState('');
  const [autoRunAI, setAutoRunAI] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!user?.workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [docsRes, conRes] = await Promise.all([
      documentService.listDocuments(user.workspaceId),
      contractorService.listContractors(user.workspaceId),
    ]);

    setDocuments(docsRes.data || []);
    setContractors(conRes.data || []);
    if (conRes.data && conRes.data.length > 0 && !uploadContractorId) {
      setUploadContractorId(conRes.data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.workspaceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadDocName) {
        setUploadDocName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspaceId) return;

    if (!uploadContractorId) {
      setUploadError('Please select a contractor');
      return;
    }

    if (!uploadDocName.trim()) {
      setUploadError('Document name is required');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const res = await documentService.uploadDocument(user.workspaceId, {
      contractorId: uploadContractorId,
      name: uploadDocName.trim(),
      type: uploadDocType,
      file: selectedFile || undefined,
      fileSize: selectedFile?.size || 0,
      expiresAt: uploadExpiresAt ? new Date(uploadExpiresAt).toISOString() : undefined,
      status: 'PENDING_REVIEW',
    });

    setUploading(false);

    if (res.error || !res.data) {
      setUploadError(res.error || 'Failed to upload document');
      return;
    }

    const createdDoc = res.data;

    setShowUploadModal(false);
    setUploadDocName('');
    setUploadDocType('GENERAL_LIABILITY');
    setUploadExpiresAt('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    await loadData();

    if (autoRunAI && createdDoc?.id) {
      handleTriggerAI(createdDoc.id, createdDoc.contractorId);
    }
  };

  const handleTriggerAI = async (docId: string, contractorId: string) => {
    let activeWsId = user?.workspaceId;
    if (!activeWsId) {
      const { user: freshUser } = await authService.getSession();
      if (freshUser?.workspaceId) {
        activeWsId = freshUser.workspaceId;
      }
    }
    if (!activeWsId) return;

    // Immediately update UI to show PROCESSING state
    setAnalyzingDocId(docId);
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, processingStatus: 'PROCESSING' } : d));

    const res = await aiDocumentService.processDocumentExtraction(activeWsId, contractorId, docId);
    setAnalyzingDocId(null);

    if (!res.success && res.error) {
      alert(`AI Extraction: ${res.error}`);
    }

    await loadData();
  };

  const handleOpenInspection = async (doc: Document) => {
    setInspectingDoc(doc);
    setManualReviewReason('');
    if (!user?.workspaceId) return;

    setLoadingExtraction(true);
    const extRes = await aiDocumentService.getDocumentExtraction(user.workspaceId, doc.id);
    setInspectingExtraction(extRes.data);
    setLoadingExtraction(false);
  };

  const handleManualVerify = async (status: 'VERIFIED' | 'REVIEW_REQUIRED' | 'FAILED') => {
    if (!user?.workspaceId || !inspectingDoc) return;

    setVerificationLoading(true);
    const res = await aiDocumentService.submitManualVerification(
      user.workspaceId,
      inspectingDoc.contractorId,
      inspectingDoc.id,
      status,
      manualReviewReason || undefined
    );
    setVerificationLoading(false);

    if (res.success) {
      setInspectingDoc(null);
      await loadData();
    } else {
      alert(res.error || 'Verification action failed');
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!user?.workspaceId) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${docName}"?`);
    if (!confirmed) return;

    setDeletingDocId(docId);
    const res = await documentService.deleteDocument(user.workspaceId, docId);
    setDeletingDocId(null);

    if (!res.success) {
      alert(res.error || 'Failed to delete document');
    } else {
      await loadData();
    }
  };

  const handleViewDocument = async (doc: Document) => {
    if (!user?.workspaceId) return;
    const url = await documentService.getDocumentDownloadUrl(user.workspaceId, doc);
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'))) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`Document: ${doc.name}\nType: ${doc.type}\nStatus: ${doc.status}\nReference: ${doc.fileUrl}`);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const contractor = contractors.find(c => c.id === doc.contractorId);
    const matchesSearch = 
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (contractor && contractor.companyName.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = selectedType === 'ALL' || doc.type === selectedType;
    const matchesAI = selectedAIStatus === 'ALL' || (doc.processingStatus || 'UPLOADED') === selectedAIStatus;

    return matchesSearch && matchesType && matchesAI;
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Compliance Documents Repository</h1>
          <p className="text-xs text-zinc-400 mt-1">Multi-tenant document repository with server-side AI OCR intelligence & traceability.</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="self-start sm:self-auto">
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        {/* Filter Controls */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input 
              placeholder="Search document name or contractor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-black/80 border-zinc-800 focus:border-red-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 px-3 rounded-lg border border-zinc-800 bg-black/80 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-red-500/60"
            >
              <option value="ALL">All Document Types</option>
              <option value="GENERAL_LIABILITY">General Liability Insurance</option>
              <option value="WORKERS_COMPENSATION">Workers Compensation</option>
              <option value="BUSINESS_LICENSE">Business License</option>
              <option value="PROFESSIONAL_LICENSE">Professional License</option>
              <option value="W9">W-9 Tax Form</option>
              <option value="SAFETY_CERTIFICATE">Safety Certificate</option>
              <option value="CERTIFICATE_OF_INSURANCE">COI</option>
              <option value="AUTO_INSURANCE">Auto Insurance</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={selectedAIStatus}
              onChange={(e) => setSelectedAIStatus(e.target.value)}
              className="h-9 px-3 rounded-lg border border-zinc-800 bg-black/80 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-red-500/60"
            >
              <option value="ALL">All AI States</option>
              <option value="VERIFIED">Verified</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
              <option value="EXTRACTED">AI Extracted</option>
              <option value="UPLOADED">Pending OCR</option>
              <option value="FAILED">AI Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-black/40">
                <th className="p-4">Document Title</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Type</th>
                <th className="p-4">AI Intelligence</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">Loading documents repository...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center bg-transparent">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-3 border border-zinc-800">
                        <FileText className="w-5 h-5 text-zinc-500" />
                      </div>
                      <p className="text-zinc-200 text-sm font-semibold mb-1">No documents uploaded</p>
                      <p className="text-zinc-500 text-xs mb-4">Upload COIs, W-9s, or compliance records for your trade partners.</p>
                      <Button size="sm" onClick={() => setShowUploadModal(true)}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Document
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">No documents match the search criteria.</td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const con = contractors.find(c => c.id === doc.contractorId);
                  const isAnalyzing = analyzingDocId === doc.id;
                  const procStatus = doc.processingStatus || 'UPLOADED';

                  return (
                    <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="p-4 font-bold text-zinc-100 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-red-950/40 border border-red-900/40 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <span>{doc.name}</span>
                      </td>
                      <td className="p-4 text-zinc-300 font-semibold">{con?.companyName || 'Contractor'}</td>
                      <td className="p-4 text-zinc-400">{DOCUMENT_TYPE_LABELS[doc.type] || doc.type.replace(/_/g, ' ')}</td>
                      <td className="p-4">
                        {procStatus === 'VERIFIED' && (
                          (!doc.verifiedBy || doc.reviewReason?.toLowerCase().includes('auto-verified')) ? (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded"
                              title={doc.reviewReason || 'Auto-verified by compliance engine'}
                            >
                              <Sparkles className="w-3 h-3 text-emerald-400" /> Auto-Verified
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/60 px-2 py-0.5 rounded"
                              title={doc.reviewReason || 'Verified by compliance officer'}
                            >
                              <ShieldCheck className="w-3 h-3 text-teal-400" /> Verified (Manual)
                            </span>
                          )
                        )}
                        {procStatus === 'EXTRACTED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                            <Sparkles className="w-3 h-3 text-red-400" /> AI Extracted
                          </span>
                        )}
                        {procStatus === 'REVIEW_REQUIRED' && (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded"
                            title={doc.reviewReason || 'Manual review required before approval'}
                          >
                            <AlertCircle className="w-3 h-3 text-amber-400" /> Review Req.
                          </span>
                        )}
                        {procStatus === 'PROCESSING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Processing
                          </span>
                        )}
                        {procStatus === 'FAILED' && (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800/60 px-2 py-0.5 rounded"
                            title={doc.reviewReason || doc.processingError || 'Processing or validation failed'}
                          >
                            <XCircle className="w-3 h-3" /> {doc.status === 'REJECTED' ? 'Rejected' : 'Failed'}
                          </span>
                        )}
                        {procStatus === 'UPLOADED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                            Pending OCR
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={
                            doc.status === 'VALID' ? 'success' : 
                            doc.status === 'EXPIRING' ? 'warning' : 
                            doc.status === 'EXPIRED' ? 'danger' : 'neutral'
                          }
                          className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider"
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-400 font-medium">
                        {doc.expiresAt ? formatDate(doc.expiresAt) : 'Permanent Record'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 text-xs"
                            disabled={isAnalyzing}
                            onClick={() => handleTriggerAI(doc.id, doc.contractorId)}
                            title="Run AI OCR Extraction"
                          >
                            {isAnalyzing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-red-400" />
                            )}
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2.5 text-xs"
                            onClick={() => handleOpenInspection(doc)}
                          >
                            Inspect
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                            onClick={() => handleViewDocument(doc)}
                            title="View / Download Document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/40"
                            disabled={deletingDocId === doc.id}
                            onClick={() => handleDeleteDocument(doc.id, doc.name)}
                            title="Delete Document"
                          >
                            {deletingDocId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AI Extraction & Human Review Modal */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-[#0a0a0f] border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 p-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                <div>
                  <h3 className="text-sm font-bold text-white">AI Document Intelligence & Inspection</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{inspectingDoc.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectingDoc(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 p-5 overflow-y-auto">
              {loadingExtraction ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-red-500" />
                  Loading extraction & compliance audit details...
                </div>
              ) : (
                <>
                  {/* Two-Tier Verification Decision Banner */}
                  <div className={`p-4 rounded-xl border text-xs ${
                    inspectingDoc.processingStatus === 'VERIFIED' ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' :
                    inspectingDoc.processingStatus === 'REVIEW_REQUIRED' ? 'bg-amber-950/30 border-amber-800/60 text-amber-300' :
                    inspectingDoc.processingStatus === 'FAILED' ? 'bg-red-950/30 border-red-800/60 text-red-300' :
                    'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {inspectingDoc.processingStatus === 'VERIFIED' ? (
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : inspectingDoc.processingStatus === 'REVIEW_REQUIRED' ? (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : inspectingDoc.processingStatus === 'FAILED' ? (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase tracking-wider text-[11px]">
                              {inspectingDoc.processingStatus === 'VERIFIED' 
                                ? ((!inspectingDoc.verifiedBy || inspectingDoc.reviewReason?.toLowerCase().includes('auto-verified')) ? 'Auto-Verified Decision' : 'Manual Verified Decision')
                                : inspectingDoc.processingStatus === 'REVIEW_REQUIRED'
                                ? 'Manual Verification Required'
                                : inspectingDoc.processingStatus === 'FAILED'
                                ? (inspectingDoc.status === 'REJECTED' ? 'Document Rejected' : 'Processing Failed')
                                : 'Pending OCR Extraction'
                              }
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-current opacity-80 font-mono">
                              Status: {inspectingDoc.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-zinc-200 font-medium">
                            {inspectingDoc.reviewReason || inspectingDoc.processingError || (
                              inspectingDoc.processingStatus === 'VERIFIED' 
                                ? 'Document passed all deterministic compliance checks.' 
                                : 'Human compliance inspection required.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deterministic Validation Rules & Check Breakdown */}
                  {inspectingExtraction?.evidenceData && (() => {
                    const con = contractors.find(c => c.id === inspectingDoc.contractorId);
                    const evidenceData = inspectingExtraction.evidenceData as any;
                    const validationFailures: string[] = evidenceData?.validationFailures || [];
                    const validationSuccesses: string[] = evidenceData?.validationSuccesses || [];

                    const contractorLegalName = con?.companyName || evidenceData?.entityMatch?.expected || 'Contractor';
                    const extractedEntityName = inspectingDoc.extractedData?.entityName?.value || inspectingExtraction.rawExtractedJson?.entityName?.value || null;

                    // Authoritative Entity Match logic
                    const hasEntityMismatchFailure = validationFailures.some((f: string) => /entity.*mismatch|no verifiable contractor entity/i.test(f));
                    const hasEntityMatchSuccess = validationSuccesses.some((s: string) => /entity matched/i.test(s));
                    const isEntityMatched = evidenceData?.entityMatch?.matched !== undefined
                      ? Boolean(evidenceData.entityMatch.matched)
                      : (hasEntityMatchSuccess ? true : (hasEntityMismatchFailure ? false : checkEntityMatch(extractedEntityName, contractorLegalName)));

                    // Authoritative Category Match logic
                    const detectedType = inspectingExtraction?.documentTypeDetected || inspectingDoc.extractedData?.documentType?.value || inspectingDoc.type;
                    const hasCategoryMismatchFailure = validationFailures.some((f: string) => /category mismatch/i.test(f));
                    const hasCategoryMatchSuccess = validationSuccesses.some((s: string) => /category verified/i.test(s));
                    const isCategoryMatched = evidenceData?.categoryMatch?.matched !== undefined
                      ? Boolean(evidenceData.categoryMatch.matched)
                      : (hasCategoryMatchSuccess ? true : !hasCategoryMismatchFailure);

                    // Authoritative Expiration Check logic
                    const isW9orTax = inspectingDoc.type === 'W9' || inspectingDoc.type === 'TAX_DOCUMENT' || inspectingDoc.type === 'SAFETY_CERTIFICATE';
                    const expDateStr = inspectingDoc.expiresAt || inspectingDoc.extractedData?.expirationDate?.value;
                    const hasExpiredFailure = validationFailures.some((f: string) => /expired on/i.test(f));
                    const isExpired = inspectingDoc.status === 'EXPIRED' || hasExpiredFailure || Boolean(expDateStr && new Date(expDateStr).getTime() < Date.now());
                    const isMissingExp = !expDateStr && !isW9orTax;

                    // Authoritative Policy / ID check logic
                    const policyNum = inspectingDoc.extractedData?.policyNumber?.value || inspectingDoc.extractedData?.documentNumber?.value || inspectingDoc.extractedData?.licenseNumber?.value;
                    const hasMissingIdFailure = validationFailures.some((f: string) => /missing policy number|missing state\/trade license/i.test(f));
                    const isIdRequired = ['GENERAL_LIABILITY', 'CERTIFICATE_OF_INSURANCE', 'WORKERS_COMPENSATION', 'AUTO_INSURANCE', 'BUSINESS_LICENSE', 'PROFESSIONAL_LICENSE'].includes(inspectingDoc.type);

                    return (
                      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Two-Tier Compliance Checks</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            OCR Confidence: {typeof evidenceData.overallConfidence === 'number' 
                              ? `${Math.round(evidenceData.overallConfidence * 100)}%` 
                              : '90%'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Check 1: Document Type Match */}
                          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            isCategoryMatched ? 'bg-black/40 border-zinc-800/80' : 'bg-red-950/20 border-red-900/50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Category Match</span>
                              {isCategoryMatched ? (
                                <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                                  <Check className="w-3 h-3 text-emerald-400" /> Matched
                                </span>
                              ) : (
                                <span className="font-bold text-red-400 flex items-center gap-1 text-xs">
                                  <XCircle className="w-3 h-3 text-red-400" /> Mismatch
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-300 mt-1 truncate" title={DOCUMENT_TYPE_LABELS[inspectingDoc.type] || inspectingDoc.type}>
                              {isCategoryMatched 
                                ? (DOCUMENT_TYPE_LABELS[inspectingDoc.type] || inspectingDoc.type.replace(/_/g, ' '))
                                : `Detected: ${detectedType.replace(/_/g, ' ')}`}
                            </p>
                          </div>

                          {/* Check 2: Entity Match */}
                          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            !extractedEntityName ? 'bg-amber-950/20 border-amber-900/40' :
                            !isEntityMatched ? 'bg-red-950/20 border-red-900/50' :
                            'bg-black/40 border-zinc-800/80'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Entity Match</span>
                              {!extractedEntityName ? (
                                <span className="font-bold text-amber-400 flex items-center gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3 text-amber-400" /> Not Detected
                                </span>
                              ) : !isEntityMatched ? (
                                <span className="font-bold text-red-400 flex items-center gap-1 text-xs">
                                  <XCircle className="w-3 h-3 text-red-400" /> Mismatch
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                                  <Check className="w-3 h-3 text-emerald-400" /> Matched
                                </span>
                              )}
                            </div>
                            
                            {!extractedEntityName ? (
                              <p className="text-[10px] text-zinc-400 mt-1">
                                <span className="text-zinc-500">Expected:</span> <strong className="text-zinc-300">{contractorLegalName}</strong>
                              </p>
                            ) : !isEntityMatched ? (
                              <div className="text-[10px] mt-1 space-y-0.5">
                                <p className="text-zinc-400 truncate" title={extractedEntityName}><span className="text-zinc-500">Extracted:</span> <strong className="text-red-300">{extractedEntityName}</strong></p>
                                <p className="text-zinc-400 truncate" title={contractorLegalName}><span className="text-zinc-500">Expected:</span> <strong className="text-zinc-300">{contractorLegalName}</strong></p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-300 mt-1 truncate" title={extractedEntityName || contractorLegalName}>
                                {extractedEntityName || contractorLegalName}
                              </p>
                            )}
                          </div>

                          {/* Check 3: Expiration Status */}
                          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            isExpired ? 'bg-red-950/20 border-red-900/50' :
                            isMissingExp ? 'bg-amber-950/20 border-amber-900/40' :
                            'bg-black/40 border-zinc-800/80'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Expiration</span>
                              {isExpired ? (
                                <span className="font-bold text-red-400 flex items-center gap-1 text-xs">
                                  <XCircle className="w-3 h-3 text-red-400" /> Expired
                                </span>
                              ) : isMissingExp ? (
                                <span className="font-bold text-amber-400 flex items-center gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3 text-amber-400" /> Missing Date
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                                  <Check className="w-3 h-3 text-emerald-400" /> Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-300 mt-1 truncate">
                              {isExpired 
                                ? (expDateStr ? `Expired on ${formatDate(expDateStr)}` : 'Document expired')
                                : isMissingExp 
                                ? 'Required for active policy'
                                : (isW9orTax ? 'Permanent Record' : `Expires ${formatDate(expDateStr!)}`)}
                            </p>
                          </div>

                          {/* Check 4: Policy / Identifier */}
                          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            (!policyNum && (isIdRequired || hasMissingIdFailure)) ? 'bg-amber-950/20 border-amber-900/40' : 'bg-black/40 border-zinc-800/80'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Policy / ID #</span>
                              {(!policyNum && (isIdRequired || hasMissingIdFailure)) ? (
                                <span className="font-bold text-amber-400 flex items-center gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3 text-amber-400" /> Missing #
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                                  <Check className="w-3 h-3 text-emerald-400" /> Recorded
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-300 mt-1 truncate" title={policyNum ? String(policyNum) : (isIdRequired ? 'Required' : 'Compliant')}>
                              {policyNum ? String(policyNum) : (isIdRequired ? 'Missing required ID #' : 'Compliant')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Extracted Metadata & Evidence Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">Extracted Metadata & Evidence</h4>
                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-black/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase font-bold">
                          <tr>
                            <th className="p-2.5">Field</th>
                            <th className="p-2.5">Extracted Value</th>
                            <th className="p-2.5">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {inspectingDoc.extractedData && Object.keys(inspectingDoc.extractedData).length > 0 ? (
                            Object.entries(inspectingDoc.extractedData).map(([key, fieldData]: [string, any]) => {
                              if (!fieldData || fieldData.value === null || fieldData.value === undefined) return null;
                              return (
                                <tr key={key} className="hover:bg-zinc-900/30">
                                  <td className="p-2.5 font-medium text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                                  <td className="p-2.5 font-bold text-zinc-200">
                                    {typeof fieldData.value === 'boolean' ? (fieldData.value ? 'Yes' : 'No') : String(fieldData.value)}
                                  </td>
                                  <td className="p-2.5 text-zinc-400">
                                    {fieldData.confidence !== undefined ? `${Math.round(fieldData.confidence * 100)}%` : '—'}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-zinc-500 text-xs">
                                No structured extraction recorded yet. Click AI OCR to extract metadata.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Immutable Audit Trail */}
                  <div className="p-3 bg-zinc-900/30 border border-zinc-800/80 rounded-xl space-y-1.5 text-xs">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Immutable Audit Record</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-[11px] text-zinc-400">
                      <div><strong className="text-zinc-300">Uploaded:</strong> {formatDate(inspectingDoc.uploadedAt)}</div>
                      <div><strong className="text-zinc-300">File Size:</strong> {(inspectingDoc.fileSize / 1024).toFixed(1)} KB</div>
                      <div>
                        <strong className="text-zinc-300">OCR Engine:</strong> {inspectingExtraction?.modelUsed || 'gemini-3.7-flash'}
                      </div>
                      <div>
                        <strong className="text-zinc-300">Decision Mode:</strong> {
                          inspectingDoc.processingStatus === 'VERIFIED' 
                            ? ((!inspectingDoc.verifiedBy || inspectingDoc.reviewReason?.toLowerCase().includes('auto-verified')) ? 'Automated (Tier 1)' : 'Manual Officer Review')
                            : inspectingDoc.processingStatus === 'REVIEW_REQUIRED' ? 'Flagged for Human Review' : 'Pending'
                        }
                      </div>
                      {inspectingDoc.verifiedAt && (
                        <div><strong className="text-zinc-300">Verified At:</strong> {formatDate(inspectingDoc.verifiedAt)}</div>
                      )}
                      {inspectingDoc.verifiedBy && (
                        <div><strong className="text-zinc-300">Reviewer ID:</strong> {inspectingDoc.verifiedBy}</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                    <Label htmlFor="reviewReason" className="text-xs font-semibold text-zinc-300">Review Notes / Compliance Reason</Label>
                    <Input 
                      id="reviewReason"
                      placeholder="Add compliance notes or reason for approval / rejection / flag..."
                      value={manualReviewReason}
                      onChange={(e) => setManualReviewReason(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 p-4 bg-zinc-950/80 border-t border-zinc-800 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewDocument(inspectingDoc)}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> View File
              </Button>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={verificationLoading}
                  onClick={() => handleManualVerify('FAILED')}
                  className="text-red-400 border-red-900/60 hover:bg-red-950/40 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-red-400" /> Reject
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={verificationLoading}
                  onClick={() => handleManualVerify('REVIEW_REQUIRED')}
                  className="text-amber-400 border-amber-900/60 hover:bg-amber-950/40 text-xs"
                >
                  Flag Review
                </Button>
                <Button 
                  size="sm"
                  disabled={verificationLoading}
                  onClick={() => handleManualVerify('VERIFIED')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  {verificationLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Approve & Verify
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-[#0a0a0f] border-zinc-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white">Upload Compliance Document</h3>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className="space-y-4 p-6">
                {uploadError && (
                  <div className="p-3 bg-red-950/50 border border-red-900/80 rounded-xl flex items-center gap-2 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="uploadContractor">Select Contractor *</Label>
                  <select
                    id="uploadContractor"
                    required
                    value={uploadContractorId}
                    onChange={(e) => setUploadContractorId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090c] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-red-500/60"
                  >
                    {contractors.length === 0 ? (
                      <option value="">No contractors available</option>
                    ) : (
                      contractors.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} ({c.trade})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <Label htmlFor="docTitle">Document Title *</Label>
                  <Input 
                    id="docTitle"
                    required
                    placeholder="e.g. 2026 Certificate of Insurance"
                    value={uploadDocName}
                    onChange={(e) => setUploadDocName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="docTypeCategory">Document Category *</Label>
                  <select
                    id="docTypeCategory"
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                    className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090c] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-red-500/60"
                  >
                    <option value="GENERAL_LIABILITY">General Liability Insurance ($2M)</option>
                    <option value="WORKERS_COMPENSATION">Workers Compensation Policy</option>
                    <option value="BUSINESS_LICENSE">State Business License</option>
                    <option value="PROFESSIONAL_LICENSE">Professional Trade License</option>
                    <option value="W9">W-9 Form (Taxpayer ID)</option>
                    <option value="SAFETY_CERTIFICATE">OSHA / Safety Certification</option>
                    <option value="CERTIFICATE_OF_INSURANCE">Certificate of Insurance (COI)</option>
                    <option value="AUTO_INSURANCE">Commercial Auto Policy</option>
                    <option value="OTHER">Other Agreement / Endorsement</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="docExpDate">Expiration Date (Optional / Overrides AI)</Label>
                  <Input 
                    id="docExpDate"
                    type="date"
                    value={uploadExpiresAt}
                    onChange={(e) => setUploadExpiresAt(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="docFileElem">Select File (PDF, PNG, JPG)</Label>
                  <input 
                    ref={fileInputRef}
                    id="docFileElem"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="flex w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-zinc-200 hover:file:bg-zinc-800 file:cursor-pointer border border-zinc-800 rounded-lg p-1 bg-black/60"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Selected: <span className="font-semibold text-zinc-200">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox"
                    id="autoRunAIDoc"
                    checked={autoRunAI}
                    onChange={(e) => setAutoRunAI(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-900 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="autoRunAIDoc" className="text-xs text-zinc-300 cursor-pointer flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    Auto-run AI Document Intelligence on upload
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 bg-zinc-950/80 border-t border-zinc-800">
                <Button type="button" variant="ghost" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Save & Upload
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
