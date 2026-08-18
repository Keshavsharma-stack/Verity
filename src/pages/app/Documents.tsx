import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Search, Upload, Filter, Download, Trash2, FileText } from 'lucide-react';
import { documentService } from '../../services/api';
import { MOCK_CONTRACTORS } from '../../data/mockData';
import { Document } from '../../types';
import { formatDate } from '../../lib/utils';

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    documentService.getDocuments().then(data => {
      setDocuments(data);
      setLoading(false);
    });
  }, []);

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Documents Repository</h1>
          <p className="text-xs font-medium text-zinc-400 mt-1">Centralized digital vault for COIs, W-9s, Master Agreements, and Safety Certifications.</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row gap-4 justify-between bg-zinc-950/60">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search documents or policy types..." 
              className="pl-9 bg-black/70 border-zinc-800 focus:ring-red-500/50 focus:border-red-500/60"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="sm:w-auto w-full">
            <Filter className="w-4 h-4 mr-2" /> Filter By Type
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-black/40">
                <th className="p-4">Document Title</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">Loading documents...</td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">No documents found.</td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const contractor = MOCK_CONTRACTORS.find(c => c.id === doc.contractorId);
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="p-4 font-bold text-zinc-100 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-red-950/40 border border-red-900/40 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <span>{doc.name}</span>
                      </td>
                      <td className="p-4 text-zinc-300 font-semibold">{contractor?.companyName || 'Unknown'}</td>
                      <td className="p-4 text-zinc-400">{doc.type.replace(/_/g, ' ')}</td>
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
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/40"
                            onClick={() => {
                              if(window.confirm('Delete this compliance record?')) {
                                // delete logic
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
