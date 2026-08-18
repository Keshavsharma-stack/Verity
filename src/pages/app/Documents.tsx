import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Search, Upload, Filter, Download, Trash2 } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Documents</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage all contractor compliance documents in one place.</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between bg-zinc-900/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search documents..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="sm:w-auto w-full">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-900/30">
                <th className="p-4">Document Name</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expiration</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">Loading documents...</td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">No documents found.</td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const contractor = MOCK_CONTRACTORS.find(c => c.id === doc.contractorId);
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-4 font-medium text-zinc-100">{doc.name}</td>
                      <td className="p-4 text-zinc-300">{contractor?.companyName || 'Unknown'}</td>
                      <td className="p-4 text-zinc-400">{doc.type.replace(/_/g, ' ')}</td>
                      <td className="p-4">
                        <Badge 
                          variant={
                            doc.status === 'VALID' ? 'success' : 
                            doc.status === 'EXPIRING' ? 'warning' : 
                            doc.status === 'EXPIRED' ? 'danger' : 'neutral'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-400">
                        {doc.expiresAt ? formatDate(doc.expiresAt) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              if(window.confirm('Are you sure you want to delete this document?')) {
                                // Mock delete
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
