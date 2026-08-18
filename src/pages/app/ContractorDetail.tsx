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
    return <div className="text-zinc-500 p-8 text-xs">Loading contractor details...</div>;
  }

  if (!contractor) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-white mb-2">Contractor Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/contractors')}>Return to Directory</Button>
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
      <Card className="bg-gradient-to-b from-[#121218] to-[#09090d] border-zinc-800/90 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">Verity Compliance Passport</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{contractor.companyName}</h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge status={liveStatus} className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold" />
              <span className="text-zinc-400 text-xs font-medium">{contractor.trade} &bull; {contractor.contractorType}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="bg-black/60 rounded-xl p-3 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Last Audit Review</div>
              <div className="text-xs font-semibold text-zinc-200">{formatDate(contractor.lastUpdated)}</div>
            </div>
            <div className="bg-black/60 rounded-xl p-3 border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Next Action</div>
              <div className={`text-xs font-bold ${liveStatus === 'NON_COMPLIANT' ? 'text-red-400' : liveStatus === 'EXPIRING' ? 'text-amber-400' : 'text-zinc-400'}`}>
                {liveStatus === 'COMPLIANT' ? 'None required' : liveStatus === 'EXPIRING' ? 'Update expiring policy' : 'Missing required documents'}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 px-6 py-3.5 flex flex-wrap gap-3">
          <Button>
            <ExternalLink className="w-4 h-4 mr-2" /> Share Passport
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/contractors/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" /> Edit Details
            </Link>
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              if(window.confirm('Are you sure you want to delete this contractor record?')) {
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
          <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-xl">
            <CardHeader className="py-4 border-b border-zinc-800/80 bg-zinc-950/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300">Identity & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Primary Representative</p>
                <p className="text-xs text-zinc-200 font-semibold">{contractor.primaryContact}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Email</p>
                <a href={`mailto:${contractor.email}`} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">{contractor.email}</a>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Phone</p>
                <a href={`tel:${contractor.phone}`} className="text-xs text-zinc-200 hover:text-white transition-colors">{contractor.phone}</a>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Operating Address</p>
                <p className="text-xs text-zinc-300 leading-relaxed">{contractor.address}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-xl">
            <CardHeader className="py-4 border-b border-zinc-800/80 bg-zinc-950/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300">Passport Requirements</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              <ul className="space-y-2.5">
                {Object.entries(contractor.requirements).map(([key, required]) => {
                  if (!required) return null;
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Required', '');
                  
                  const hasValidDoc = documents.some(d => d.type === key && d.status === 'VALID');
                  const hasExpiringDoc = documents.some(d => d.type === key && d.status === 'EXPIRING');
                  
                  return (
                    <li key={key} className="flex items-center text-xs font-medium text-zinc-300 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                      {hasValidDoc ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
                      ) : hasExpiringDoc ? (
                        <AlertCircle className="w-4 h-4 text-amber-400 mr-2.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mr-2.5 shrink-0" />
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
          <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-zinc-800/80 bg-zinc-950/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300">Document Ledger</CardTitle>
              <div className="flex gap-2 items-center">
                <Badge variant="neutral" className="text-[10px] px-2 py-0.5">{documents.length} Total</Badge>
                <Button size="sm" asChild className="ml-2">
                  <Link to="/documents">
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-8 text-center bg-transparent">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-xs font-medium">No documents uploaded yet.</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link to="/documents">Upload First Document</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/60 bg-transparent">
                  {documents.map(doc => (
                    <li key={doc.id} className={`p-4 flex items-start justify-between hover:bg-zinc-900/40 transition-colors ${doc.status === 'EXPIRED' ? 'bg-red-950/20' : doc.status === 'EXPIRING' ? 'bg-amber-950/15' : ''}`}>
                      <div className="flex gap-3.5">
                        <div className="mt-0.5">
                          {doc.status === 'VALID' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {doc.status === 'EXPIRING' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                          {doc.status === 'EXPIRED' && <XCircle className="w-4 h-4 text-red-500" />}
                          {doc.status === 'PENDING_REVIEW' && <Clock className="w-4 h-4 text-zinc-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-100">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-medium text-zinc-400">{doc.type.replace(/_/g, ' ')}</span>
                            <span className="text-zinc-600">•</span>
                            <span className={`text-[11px] font-semibold ${doc.status === 'EXPIRED' ? 'text-red-400' : doc.status === 'EXPIRING' ? 'text-amber-400' : 'text-zinc-400'}`}>
                              {doc.expiresAt ? `Expires ${formatDate(doc.expiresAt)}` : 'Permanent'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">View</Button>
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
