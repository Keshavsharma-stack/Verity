import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { documentService } from '../../services/api';
import { MOCK_CONTRACTORS } from '../../data/mockData';
import { Document } from '../../types';
import { formatDate, getDaysRemaining } from '../../lib/utils';
import { AlertCircle, Clock, XCircle, Send, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Expirations() {
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      documentService.getExpiringDocuments(90),
      documentService.getExpiredDocuments()
    ]).then(([expiring, expired]) => {
      setExpiringDocs(expiring.sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime()));
      setExpiredDocs(expired);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500 p-8 text-xs">Loading expiration tracking data...</div>;

  const expiredCount = expiredDocs.length;
  const expiring7 = expiringDocs.filter(d => getDaysRemaining(d.expiresAt!) <= 7).length;
  const expiring30 = expiringDocs.filter(d => {
    const days = getDaysRemaining(d.expiresAt!);
    return days > 7 && days <= 30;
  }).length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Expiration Radar & Renewal Center</h1>
        <p className="text-xs font-medium text-zinc-400 mt-1">Automatic 60/30/15-day risk monitoring and automated subcontractor document requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-b from-[#180e12] to-[#0c080a] border-red-950/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-400">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">Lapsed Policies (Expired)</p>
                <p className="text-3xl font-extrabold text-red-400 mt-0.5">{expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-b from-[#18140e] to-[#0c0a08] border-amber-950/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Critical Expirations (&lt; 7 Days)</p>
                <p className="text-3xl font-extrabold text-amber-400 mt-0.5">{expiring7}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-[#121218] to-[#09090d] border-zinc-800/90 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-zinc-600" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Upcoming Expirations (30 Days)</p>
                <p className="text-3xl font-extrabold text-white mt-0.5">{expiring30}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Mandatory Action Required
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-black/40">
                <th className="p-4">Document</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {[...expiredDocs, ...expiringDocs].map((doc) => {
                const contractor = MOCK_CONTRACTORS.find(c => c.id === doc.contractorId);
                const daysRemaining = getDaysRemaining(doc.expiresAt!);
                const isExpired = daysRemaining < 0;
                
                return (
                  <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors group">
                    <td className="p-4 font-bold text-zinc-100">{doc.name}</td>
                    <td className="p-4 text-zinc-300">
                      <Link to={`/contractors/${contractor?.id}`} className="hover:text-red-400 font-semibold transition-colors">
                        {contractor?.companyName || 'Unknown'}
                      </Link>
                    </td>
                    <td className="p-4 text-zinc-300">
                      <div className="font-semibold">{formatDate(doc.expiresAt!)}</div>
                      <div className={`text-[11px] mt-0.5 font-bold ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                        {isExpired ? 'Expired' : `${daysRemaining} days remaining`}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={isExpired ? 'danger' : 'warning'} className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider">
                        {isExpired ? 'EXPIRED' : 'EXPIRING'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm" className="hover:border-red-500/60 hover:text-white">
                        <Send className="w-3 h-3 mr-1.5 text-red-500" />
                        Request Renewal
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {expiredDocs.length === 0 && expiringDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-zinc-500 bg-transparent">No documents are expiring soon.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
