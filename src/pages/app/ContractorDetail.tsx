import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Label } from '../../components/ui/Input';
import { 
  ArrowLeft, 
  Upload, 
  Edit, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  Loader2, 
  Plus, 
  X,
  Download,
  FileCheck,
  Sparkles,
  Search,
  Check,
  ShieldAlert,
  Info
} from 'lucide-react';
import { contractorService } from '../../services/contractorService';
import { documentService } from '../../services/documentService';
import { complianceService, REQUIREMENT_TYPE_MAPPINGS } from '../../services/complianceService';
import { aiDocumentService } from '../../services/aiDocumentService';
import { authService } from '../../services/authService';
import { Contractor, Document, DocumentType, ComplianceRequirement, DocumentExtraction } from '../../types';
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

export function ContractorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('GENERAL_LIABILITY');
  const [uploadExpiresAt, setUploadExpiresAt] = useState('');
  const [autoRunAI, setAutoRunAI] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Document Deleting / AI Processing state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);

  // Inspection Drawer / Modal state
  const [inspectingDoc, setInspectingDoc] = useState<Document | null>(null);
  const [inspectingExtraction, setInspectingExtraction] = useState<DocumentExtraction | null>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [manualReviewReason, setManualReviewReason] = useState('');

  const loadData = async () => {
    if (!id || !user?.workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [conRes, docsRes] = await Promise.all([
      contractorService.getContractorById(user.workspaceId, id),
      documentService.listDocuments(user.workspaceId, id),
    ]);

    if (conRes.error) {
      setError(conRes.error);
    } else {
      setContractor(conRes.data);
    }

    setDocuments(docsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, user?.workspaceId]);

  const handleDeleteContractor = async () => {
    if (!user?.workspaceId || !id || !contractor) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${contractor.companyName}? All associated passport requirements and documents will be removed.`);
    if (!confirmed) return;

    setDeleting(true);
    const res = await contractorService.deleteContractor(user.workspaceId, id);
    if (!res.success) {
      alert(res.error || 'Failed to delete contractor.');
      setDeleting(false);
    } else {
      navigate('/contractors');
    }
  };

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
    let activeWsId = user?.workspaceId;
    if (!activeWsId) {
      const { user: freshUser } = await authService.getSession();
      if (freshUser?.workspaceId) {
        activeWsId = freshUser.workspaceId;
      }
    }

    if (!activeWsId || !id) {
      setUploadError('Active workspace not found. Please refresh and try again.');
      return;
    }

    if (!uploadDocName.trim()) {
      setUploadError('Document name is required');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const res = await documentService.uploadDocument(activeWsId, {
      contractorId: id,
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

    // Reset modal
    setShowUploadModal(false);
    setUploadDocName('');
    setUploadDocType('GENERAL_LIABILITY');
    setUploadExpiresAt('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    await loadData();

    // Auto-trigger AI OCR analysis if requested
    if (autoRunAI && createdDoc?.id) {
      handleTriggerAI(createdDoc.id);
    }
  };

  const handleTriggerAI = async (docId: string) => {
    let activeWsId = user?.workspaceId;
    if (!activeWsId) {
      const { user: freshUser } = await authService.getSession();
      if (freshUser?.workspaceId) {
        activeWsId = freshUser.workspaceId;
      }
    }
    if (!activeWsId || !id) return;

    setAnalyzingDocId(docId);
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, processingStatus: 'PROCESSING' } : d));

    const res = await aiDocumentService.processDocumentExtraction(activeWsId, id, docId);
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
    if (!user?.workspaceId || !id || !inspectingDoc) return;

    setVerificationLoading(true);
    const res = await aiDocumentService.submitManualVerification(
      user.workspaceId,
      id,
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

    const confirmed = window.confirm(`Are you sure you want to remove "${docName}"?`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-zinc-500 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-500" />
        <span>Loading contractor passport...</span>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-white mb-2">Contractor Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">{error || 'This contractor may have been removed or belongs to another workspace.'}</p>
        <Button variant="outline" onClick={() => navigate('/contractors')}>Return to Directory</Button>
      </div>
    );
  }

  const gateResult = complianceService.evaluateCompliancePure(
    contractor.id,
    contractor.workspaceId,
    contractor.companyName,
    contractor.requirements,
    documents
  );

  const isReady = gateResult.status === 'READY';
  const isReviewRequired = gateResult.status === 'REVIEW_REQUIRED';
  const isNotReady = gateResult.status === 'NOT_READY';

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contractors')} className="text-zinc-400 hover:text-white px-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contractors
        </Button>
      </div>

      {/* Verity Passport Header Card */}
      <Card className="bg-gradient-to-b from-[#121218] to-[#09090d] border-zinc-800/90 shadow-2xl overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${isReady ? 'bg-emerald-500' : isReviewRequired ? 'bg-amber-500' : 'bg-red-500'}`} />
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{contractor.companyName}</h1>
                <Badge 
                  variant={isReady ? 'success' : isReviewRequired ? 'warning' : 'danger'}
                  className="text-xs px-3 py-1 font-bold uppercase tracking-wider"
                >
                  {isReady ? 'READY' : isReviewRequired ? 'REVIEW REQUIRED' : 'NOT READY'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span><strong className="text-zinc-300">Trade:</strong> {contractor.trade}</span>
                <span>•</span>
                <span><strong className="text-zinc-300">Type:</strong> {contractor.contractorType}</span>
                <span>•</span>
                <span><strong className="text-zinc-300">Primary Contact:</strong> {contractor.primaryContact} ({contractor.email})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/contractors/${id}/edit`}>
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                </Link>
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteContractor}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Delete Contractor
              </Button>
            </div>
          </div>

          {/* Compliance Gate Metrics & Action Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4 border-t border-zinc-800/80 text-xs">
            <div className="bg-black/40 border border-zinc-800/80 rounded-lg p-2.5 text-center">
              <div className="text-zinc-400 text-[10px] uppercase font-bold">Required</div>
              <div className="text-base font-extrabold text-white mt-0.5">{gateResult.requiredCount}</div>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2.5 text-center">
              <div className="text-emerald-400 text-[10px] uppercase font-bold">Valid</div>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">{gateResult.validCount}</div>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 text-center">
              <div className="text-amber-400 text-[10px] uppercase font-bold">Expiring</div>
              <div className="text-base font-extrabold text-amber-400 mt-0.5">{gateResult.expiringCount}</div>
            </div>
            <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-2.5 text-center">
              <div className="text-red-400 text-[10px] uppercase font-bold">Expired</div>
              <div className="text-base font-extrabold text-red-400 mt-0.5">{gateResult.expiredCount}</div>
            </div>
            <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-2.5 text-center">
              <div className="text-red-400 text-[10px] uppercase font-bold">Missing</div>
              <div className="text-base font-extrabold text-red-400 mt-0.5">{gateResult.missingCount}</div>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 text-center">
              <div className="text-amber-300 text-[10px] uppercase font-bold">Review Req.</div>
              <div className="text-base font-extrabold text-amber-300 mt-0.5">{gateResult.reviewRequiredCount}</div>
            </div>
          </div>

          {/* Next Required Action Banner */}
          {gateResult.nextRequiredAction && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
              isReady 
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' 
                : isReviewRequired
                ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                : 'bg-red-950/30 border-red-800/50 text-red-300'
            }`}>
              {isReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isReviewRequired ? (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-bold mr-1.5">Compliance Gate Action:</span>
                <span>{gateResult.nextRequiredAction}</span>
              </div>
              {gateResult.lastReview?.reviewedAt && (
                <span className="text-[10px] text-zinc-400 hidden sm:inline shrink-0">
                  Last verified: {formatDate(gateResult.lastReview.reviewedAt)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Compliance Matrix & Uploaded Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Required Passport Matrix */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80 py-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Compliance Passport Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-zinc-800/60 text-xs">
                {gateResult.requirements.map(reqEval => {
                  if (!reqEval.required) return null;

                  const isSatisfied = reqEval.status === 'SATISFIED';
                  const isExpiring = reqEval.status === 'EXPIRING';
                  const isExpired = reqEval.status === 'EXPIRED';
                  const isMissing = reqEval.status === 'MISSING';
                  const isDeficient = reqEval.status === 'DEFICIENT';
                  const isReviewReq = reqEval.status === 'MANUAL_REVIEW_REQUIRED';

                  return (
                    <li key={reqEval.requirementId} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {isSatisfied ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isExpiring ? (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : isReviewReq ? (
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-zinc-200">{reqEval.name}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {reqEval.reason || (isSatisfied ? 'Verified & on file' : 'Action required')}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          isSatisfied ? 'success' :
                          isExpiring ? 'warning' :
                          isReviewReq ? 'warning' :
                          'danger'
                        }
                        className="text-[10px] px-2 py-0.5 font-bold uppercase shrink-0"
                      >
                        {isSatisfied ? 'Satisfied' :
                         isExpiring ? 'Expiring' :
                         isReviewReq ? 'Review Req.' :
                         isDeficient ? 'Deficient' :
                         isExpired ? 'Expired' :
                         'Missing'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Verified Documents & AI OCR List */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-400" />
                Verified Documents & AI OCR Intelligence
              </CardTitle>
              <Button size="sm" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Document
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-10 text-center bg-transparent">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-300 text-xs font-semibold">No compliance documents uploaded yet</p>
                  <p className="text-zinc-500 text-[11px] mt-1 mb-4">Upload COIs, W-9s, or OSHA certificates to establish verification for {contractor.companyName}.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload First Document
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/60 bg-transparent">
                  {documents.map(doc => {
                    const isAnalyzing = analyzingDocId === doc.id;
                    const procStatus = doc.processingStatus || 'UPLOADED';

                    return (
                      <li key={doc.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors ${doc.status === 'EXPIRED' ? 'bg-red-950/15' : doc.status === 'EXPIRING' ? 'bg-amber-950/10' : ''}`}>
                        <div className="flex gap-3.5 items-start">
                          <div className="mt-0.5">
                            {doc.status === 'VALID' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            {doc.status === 'EXPIRING' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                            {doc.status === 'EXPIRED' && <XCircle className="w-4 h-4 text-red-500" />}
                            {doc.status === 'PENDING_REVIEW' && <Clock className="w-4 h-4 text-zinc-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-zinc-100">{doc.name}</p>
                              
                              {/* Processing Status Badge */}
                              {procStatus === 'VERIFIED' && (
                                (!doc.verifiedBy || doc.reviewReason?.toLowerCase().includes('auto-verified')) ? (
                                  <span 
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded"
                                    title={doc.reviewReason || 'Auto-verified by compliance engine'}
                                  >
                                    <Sparkles className="w-3 h-3 text-emerald-400" /> Auto-Verified
                                  </span>
                                ) : (
                                  <span 
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/60 px-1.5 py-0.5 rounded"
                                    title={doc.reviewReason || 'Verified by compliance reviewer'}
                                  >
                                    <ShieldCheck className="w-3 h-3 text-teal-400" /> Verified (Manual)
                                  </span>
                                )
                              )}
                              {procStatus === 'EXTRACTED' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                                  <Sparkles className="w-3 h-3 text-red-400" /> AI Extracted
                                </span>
                              )}
                              {procStatus === 'REVIEW_REQUIRED' && (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded"
                                  title={doc.reviewReason || 'Manual review required'}
                                >
                                  <AlertCircle className="w-3 h-3 text-amber-400" /> Review Required
                                </span>
                              )}
                              {procStatus === 'PROCESSING' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 rounded animate-pulse">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Processing
                                </span>
                              )}
                              {procStatus === 'FAILED' && (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800/60 px-1.5 py-0.5 rounded"
                                  title={doc.reviewReason || doc.processingError || 'Processing failed'}
                                >
                                  <XCircle className="w-3 h-3" /> {doc.status === 'REJECTED' ? 'Rejected' : 'AI Failed'}
                                </span>
                              )}
                              {procStatus === 'UPLOADED' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                                  Pending OCR
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[11px] font-medium text-zinc-400">{DOCUMENT_TYPE_LABELS[doc.type] || doc.type.replace(/_/g, ' ')}</span>
                              <span className="text-zinc-600">•</span>
                              <span className={`text-[11px] font-semibold ${doc.status === 'EXPIRED' ? 'text-red-400' : doc.status === 'EXPIRING' ? 'text-amber-400' : 'text-zinc-400'}`}>
                                {doc.expiresAt ? `Expires ${formatDate(doc.expiresAt)}` : 'Permanent / Non-Expiring'}
                              </span>
                            </div>

                            {doc.reviewReason && (
                              <p className="text-[11px] text-amber-300/90 mt-1 bg-amber-950/30 p-1.5 rounded border border-amber-900/40">
                                <strong>Flag:</strong> {doc.reviewReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* AI Extract / Re-analyze button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 hover:border-red-500/60"
                            disabled={isAnalyzing}
                            onClick={() => handleTriggerAI(doc.id)}
                          >
                            {isAnalyzing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 mr-1 text-red-400" />
                            )}
                            {procStatus === 'UPLOADED' || procStatus === 'FAILED' ? 'AI OCR' : 'Re-analyze'}
                          </Button>

                          {/* Inspection / Review Button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8"
                            onClick={() => handleOpenInspection(doc)}
                          >
                            <Search className="w-3.5 h-3.5 mr-1" /> Inspect
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-8 text-zinc-500 hover:text-red-400"
                            disabled={deletingDocId === doc.id}
                            onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          >
                            {deletingDocId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Extraction & Human Review Modal */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-[#0a0a0f] border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 bg-zinc-950/80 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                <div>
                  <CardTitle className="text-sm font-bold text-white">AI Document Intelligence & Inspection</CardTitle>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{inspectingDoc.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectingDoc(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>

            <CardContent className="space-y-4 p-5 overflow-y-auto">
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
                    const evidenceData = inspectingExtraction.evidenceData as any;
                    const validationFailures: string[] = evidenceData?.validationFailures || [];
                    const validationSuccesses: string[] = evidenceData?.validationSuccesses || [];

                    const contractorLegalName = contractor?.companyName || evidenceData?.entityMatch?.expected || 'Contractor';
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

                  {/* Extracted Fields Table */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">Extracted Metadata & Evidence</h3>
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
                                No structured extraction recorded yet. Click "AI OCR" to run extraction.
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
                        <strong className="text-zinc-300">OCR Engine:</strong> {inspectingExtraction?.modelUsed || 'gemini-3.1-flash-lite'}
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

                  {/* Manual Review Action Section */}
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
            </CardContent>

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
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 bg-zinc-950/80 py-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-red-500" />
                <CardTitle className="text-sm font-bold text-white">Upload Compliance Document</CardTitle>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleUploadSubmit}>
              <CardContent className="space-y-4 pt-5">
                {uploadError && (
                  <div className="p-3 bg-red-950/50 border border-red-900/80 rounded-xl flex items-center gap-2 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="docName">Document Title *</Label>
                  <Input 
                    id="docName"
                    required
                    placeholder="e.g. 2026 Certificate of Insurance"
                    value={uploadDocName}
                    onChange={(e) => setUploadDocName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="docType">Document Category *</Label>
                  <select
                    id="docType"
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
                  <Label htmlFor="docExpiration">Expiration Date (Optional / Overrides AI)</Label>
                  <Input 
                    id="docExpiration"
                    type="date"
                    value={uploadExpiresAt}
                    onChange={(e) => setUploadExpiresAt(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fileInput">Select File (PDF, PNG, JPG)</Label>
                  <input 
                    ref={fileInputRef}
                    id="fileInput"
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
                    id="autoRunAI"
                    checked={autoRunAI}
                    onChange={(e) => setAutoRunAI(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-900 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="autoRunAI" className="text-xs text-zinc-300 cursor-pointer flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    Auto-run AI Document Intelligence & OCR extraction on upload
                  </label>
                </div>
              </CardContent>

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
