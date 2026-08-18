import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Users, ShieldAlert, AlertTriangle, CheckCircle, FileText, Plus, ArrowRight } from 'lucide-react';
import { MOCK_CONTRACTORS, MOCK_ACTIVITIES } from '../../data/mockData';
import { formatDate } from '../../lib/utils';
import { documentService } from '../../services/api';
import { Document } from '../../types';

export function Dashboard() {
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentService.getExpiringDocuments().then(docs => {
      setExpiringDocs(docs);
      setLoading(false);
    });
  }, []);

  const stats = [
    { name: 'Total Contractors', value: MOCK_CONTRACTORS.length, icon: Users, color: 'text-blue-500' },
    { name: 'Compliant', value: MOCK_CONTRACTORS.filter(c => c.status === 'COMPLIANT').length, icon: CheckCircle, color: 'text-emerald-500' },
    { name: 'Expiring Soon', value: MOCK_CONTRACTORS.filter(c => c.status === 'EXPIRING').length, icon: AlertTriangle, color: 'text-amber-500' },
    { name: 'Non-Compliant', value: MOCK_CONTRACTORS.filter(c => c.status === 'NON_COMPLIANT').length, icon: ShieldAlert, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Verity Overview</h1>
          <p className="text-[13px] font-medium text-zinc-500 mt-1">Monitor contractor documentation and upcoming compliance issues.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800" asChild>
            <Link to="/documents"><FileText className="w-4 h-4 mr-2" /> Upload Document</Link>
          </Button>
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-white shadow-sm" asChild>
            <Link to="/contractors/new"><Plus className="w-4 h-4 mr-2" /> Add Contractor</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="bg-zinc-900/40 border-zinc-800/80 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text-', 'bg-')}`}></div>
            <CardContent className="p-5 pl-6">
              <div className="text-[11px] font-semibold text-zinc-500 mb-2 flex items-center justify-between uppercase tracking-wider">
                {stat.name}
                <stat.icon className={`h-4 w-4 ${stat.color} opacity-80`} aria-hidden="true" />
              </div>
              <div className="text-3xl font-semibold text-zinc-100 mt-1">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col h-full bg-zinc-900/40 border-zinc-800/80 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-zinc-800/60 bg-zinc-950/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">Expiring Documents</CardTitle>
              <Link to="/expirations" className="text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Loading...</div>
            ) : expiringDocs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-[13px] font-medium">No documents expiring soon.</div>
            ) : (
              <ul className="divide-y divide-zinc-800/40 bg-zinc-950/10">
                {expiringDocs.slice(0, 5).map(doc => {
                  const contractor = MOCK_CONTRACTORS.find(c => c.id === doc.contractorId);
                  return (
                    <li key={doc.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-zinc-200">{doc.name}</span>
                          <span className="text-[12px] font-medium text-zinc-500 mt-0.5">{contractor?.companyName}</span>
                        </div>
                        <div className="text-right">
                          <Badge variant={doc.status === 'EXPIRING' ? 'warning' : 'danger'} className="text-[10px] px-2 py-0.5 font-semibold tracking-wider uppercase">
                            {doc.expiresAt ? formatDate(doc.expiresAt) : 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full bg-zinc-900/40 border-zinc-800/80 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-zinc-800/60 bg-zinc-950/20">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ul className="divide-y divide-zinc-800/40 bg-zinc-950/10">
              {MOCK_ACTIVITIES.slice(0, 5).map(activity => (
                <li key={activity.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex space-x-4">
                    <div className="mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-[13px] font-medium text-zinc-300 leading-snug">{activity.description}</span>
                      <span className="text-[11px] font-medium text-zinc-500 mt-1">{formatDate(activity.createdAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
