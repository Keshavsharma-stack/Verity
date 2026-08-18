import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Upload, Edit, ExternalLink, FileText, CheckCircle2, AlertCircle, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { contractorService, documentService, complianceService } from '../../services/api';
import { Contractor, Document } from '../../types';
import { formatDate } from '../../lib/utils';

export function ContractorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      contractorService.getContractorById(id),
      documentService.getDocumentsByContractor(id)
    ]).then(([con, docs]) => {
      setContractor(con || null);
      setDocuments(docs);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="text-zinc-500 p-8">Loading details...</div>;
  }

  if (!contractor) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium text-white mb-2">Contractor Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/contractors')}>Go Back</Button>
      </div>
    );
  }

  const liveStatus = complianceService.calculateStatus(contractor, documents);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white px-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contractors
        </Button>
      </div>

      {/* Verity Passport Header Card */}
      <Card className="bg-zinc-900/50 border-zinc-800/80 shadow-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 via-zinc-800 to-transparent"></div>
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500">Verity Passport</span>
            </div>
            <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">{contractor.companyName}</h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge status={liveStatus} className="px-3 py-1 text-[11px] uppercase tracking-wider font-semibold" />
              <span className="text-zinc-400 text-sm font-medium">{contractor.trade} &bull; {contractor.contractorType}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/60">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Last Review</div>
              <div className="text-sm font-medium text-zinc-300">{formatDate(contractor.lastUpdated)}</div>
            </div>
            <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/60">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Next Action</div>
              <div className={`text-sm font-medium ${liveStatus === 'NON_COMPLIANT' ? 'text-red-400' : liveStatus === 'EXPIRING' ? 'text-amber-400' : 'text-zinc-500'}`}>
                {liveStatus === 'COMPLIANT' ? 'None required' : liveStatus === 'EXPIRING' ? 'Update expiring docs' : 'Missing required docs'}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-800/60 bg-zinc-950/30 px-6 py-3 flex flex-wrap gap-3">
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-white shadow-sm">
            <ExternalLink className="w-4 h-4 mr-2" /> Share Passport
          </Button>
          <Button variant="outline" className="bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800" asChild>
            <Link to={`/contractors/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" /> Edit Details
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
            onClick={() => {
              if(window.confirm('Are you sure you want to delete this contractor? This action cannot be undone.')) {
                // Mock delete
                navigate('/contractors');
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left Column - Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-sm">
            <CardHeader className="py-4 border-b border-zinc-800/50">
              <CardTitle className="text-[13px] uppercase tracking-wider text-zinc-400">Identity & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div>
                <p className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-1">Primary Contact</p>
                <p className="text-[14px] text-zinc-200 font-medium">{contractor.primaryContact}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-1">Email</p>
                <a href={`mailto:${contractor.email}`} className="text-[14px] text-zinc-200 hover:text-white transition-colors">{contractor.email}</a>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-1">Phone</p>
                <a href={`tel:${contractor.phone}`} className="text-[14px] text-zinc-200 hover:text-white transition-colors">{contractor.phone}</a>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-1">Address</p>
                <p className="text-[14px] text-zinc-200 leading-relaxed">{contractor.address}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-sm">
            <CardHeader className="py-4 border-b border-zinc-800/50">
              <CardTitle className="text-[13px] uppercase tracking-wider text-zinc-400">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              <ul className="space-y-3">
                {Object.entries(contractor.requirements).map(([key, required]) => {
                  if (!required) return null;
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Required', '');
                  
                  // Check if document exists and is valid to show correct indicator
                  const hasValidDoc = documents.some(d => d.type === key && d.status === 'VALID');
                  const hasExpiringDoc = documents.some(d => d.type === key && d.status === 'EXPIRING');
                  
                  return (
                    <li key={key} className="flex items-center text-[13px] font-medium text-zinc-300 bg-zinc-950/30 p-2.5 rounded-md border border-zinc-800/50">
                      {hasValidDoc ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3 shrink-0" />
                      ) : hasExpiringDoc ? (
                        <AlertCircle className="w-4 h-4 text-amber-500 mr-3 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mr-3 shrink-0" />
                      )}
                      {label}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Documents Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-zinc-800/50">
              <CardTitle className="text-[13px] uppercase tracking-wider text-zinc-400">Document Ledger</CardTitle>
              <div className="flex gap-2 items-center">
                <Badge variant="neutral" className="text-[10px] px-2 py-0.5">{documents.length} Total</Badge>
                <Button size="sm" className="h-7 text-xs px-2.5 bg-zinc-100 text-zinc-900 hover:bg-white ml-2">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-8 text-center bg-zinc-900/20">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-medium">No documents uploaded yet.</p>
                  <Button variant="outline" size="sm" className="mt-4 bg-zinc-900/50">Upload First Document</Button>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/60 bg-zinc-900/20">
                  {documents.map(doc => (
                    <li key={doc.id} className={`p-4 flex items-start justify-between hover:bg-zinc-800/40 transition-colors ${doc.status === 'EXPIRED' ? 'bg-red-950/5' : doc.status === 'EXPIRING' ? 'bg-amber-950/5' : ''}`}>
                      <div className="flex gap-4">
                        <div className="mt-0.5">
                          {doc.status === 'VALID' && <CheckCircle2 className="w-5 h-5 text-emerald-500/80" />}
                          {doc.status === 'EXPIRING' && <AlertCircle className="w-5 h-5 text-amber-500/80" />}
                          {doc.status === 'EXPIRED' && <XCircle className="w-5 h-5 text-red-500/80" />}
                          {doc.status === 'PENDING_REVIEW' && <Clock className="w-5 h-5 text-blue-500/80" />}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-zinc-100">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[12px] font-medium text-zinc-500">{doc.type.replace(/_/g, ' ')}</span>
                            <span className="text-zinc-700">•</span>
                            <span className={`text-[12px] font-medium ${doc.status === 'EXPIRED' ? 'text-red-400' : doc.status === 'EXPIRING' ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {doc.expiresAt ? `Expires ${formatDate(doc.expiresAt)}` : 'No expiration'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">View</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
