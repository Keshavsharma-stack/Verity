import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { documentService } from '../../services/api';
import { MOCK_CONTRACTORS } from '../../data/mockData';
import { Document } from '../../types';
import { formatDate, getDaysRemaining } from '../../lib/utils';
import { AlertCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Expirations() {
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      documentService.getExpiringDocuments(90), // get docs expiring in next 90 days
      documentService.getExpiredDocuments()
    ]).then(([expiring, expired]) => {
      setExpiringDocs(expiring.sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime()));
      setExpiredDocs(expired);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500 p-8">Loading expiration data...</div>;

  const expiredCount = expiredDocs.length;
  const expiring7 = expiringDocs.filter(d => getDaysRemaining(d.expiresAt!) <= 7).length;
  const expiring30 = expiringDocs.filter(d => {
    const days = getDaysRemaining(d.expiresAt!);
    return days > 7 && days <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Expiration Center</h1>
        <p className="text-sm text-zinc-400 mt-1">Monitor upcoming document expirations and manage renewals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">Already Expired</p>
                <p className="text-2xl font-semibold text-white">{expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">Expiring in &lt; 7 Days</p>
                <p className="text-2xl font-semibold text-white">{expiring7}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">Expiring in 30 Days</p>
                <p className="text-2xl font-semibold text-white">{expiring30}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Required</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-900/30">
                <th className="p-4">Document</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {[...expiredDocs, ...expiringDocs].map((doc) => {
                const contractor = MOCK_CONTRACTORS.find(c => c.id === doc.contractorId);
                const daysRemaining = getDaysRemaining(doc.expiresAt!);
                const isExpired = daysRemaining < 0;
                
                return (
                  <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4 font-medium text-zinc-100">{doc.name}</td>
                    <td className="p-4 text-zinc-300">
                      <Link to={`/contractors/${contractor?.id}`} className="hover:text-emerald-400 hover:underline">
                        {contractor?.companyName || 'Unknown'}
                      </Link>
                    </td>
                    <td className="p-4 text-zinc-300">
                      <div>{formatDate(doc.expiresAt!)}</div>
                      <div className={`text-xs mt-0.5 ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                        {isExpired ? 'Expired' : `${daysRemaining} days left`}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={isExpired ? 'danger' : 'warning'}>
                        {isExpired ? 'EXPIRED' : 'EXPIRING'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm">Request Update</Button>
                    </td>
                  </tr>
                )
              })}
              {expiredDocs.length === 0 && expiringDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">No documents are expiring soon.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
