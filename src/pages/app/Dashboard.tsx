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
    { name: 'Total Contractors', value: MOCK_CONTRACTORS.length, icon: Users, color: 'text-zinc-300', accent: 'bg-zinc-600', glow: '' },
    { name: 'Compliant', value: MOCK_CONTRACTORS.filter(c => c.status === 'COMPLIANT').length, icon: CheckCircle, color: 'text-emerald-400', accent: 'bg-emerald-500', glow: '' },
    { name: 'Expiring Soon', value: MOCK_CONTRACTORS.filter(c => c.status === 'EXPIRING').length, icon: AlertTriangle, color: 'text-amber-400', accent: 'bg-amber-500', glow: '' },
    { name: 'Non-Compliant', value: MOCK_CONTRACTORS.filter(c => c.status === 'NON_COMPLIANT').length, icon: ShieldAlert, color: 'text-red-400', accent: 'bg-red-500', glow: 'border-red-950/80 bg-red-950/10' },
  ];

  return (
    <div className="space-y-7 max-w-[1200px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Verity Intelligence Hub</h1>
          <p className="text-xs font-medium text-zinc-400 mt-1">Real-time status monitoring, risk exposure, and expiring documents.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/documents"><FileText className="w-4 h-4 mr-2" /> Upload Document</Link>
          </Button>
          <Button asChild>
            <Link to="/contractors/new"><Plus className="w-4 h-4 mr-2" /> Add Contractor</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className={`bg-gradient-to-b from-[#111116] to-[#09090d] border border-zinc-800/90 shadow-xl relative overflow-hidden ${stat.glow}`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${stat.accent}`} />
            <CardContent className="p-5 pl-6">
              <div className="text-[11px] font-bold text-zinc-400 mb-2 flex items-center justify-between uppercase tracking-wider">
                {stat.name}
                <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
              </div>
              <div className={`text-3xl font-extrabold mt-1 ${stat.color === 'text-zinc-300' ? 'text-white' : stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Documents Card */}
        <Card className="flex flex-col h-full bg-[#0a0a0f] border-zinc-800/80 shadow-xl overflow-hidden">
          <CardHeader className="py-4 border-b border-zinc-800/80 bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Immediate Expirations
              </CardTitle>
              <Link to="/expirations" className="text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors flex items-center">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-xs">Loading records...</div>
            ) : expiringDocs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-medium">All contractor documents are up to date.</div>
            ) : (
              <ul className="divide-y divide-zinc-800/60 bg-transparent">
                {expiringDocs.slice(0, 5).map(doc => {
                  const contractor = MOCK_CONTRACTORS.find(c => c.id === doc.contractorId);
                  return (
                    <li key={doc.id} className="p-4 hover:bg-zinc-900/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-100">{doc.name}</span>
                          <span className="text-[11px] font-medium text-zinc-400 mt-0.5">{contractor?.companyName}</span>
                        </div>
                        <div className="text-right">
                          <Badge variant={doc.status === 'EXPIRING' ? 'warning' : 'danger'} className="text-[10px] px-2 py-0.5 font-bold tracking-wider uppercase">
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

        {/* Recent Activity Card */}
        <Card className="flex flex-col h-full bg-[#0a0a0f] border-zinc-800/80 shadow-xl overflow-hidden">
          <CardHeader className="py-4 border-b border-zinc-800/80 bg-zinc-950/60">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300">Compliance Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ul className="divide-y divide-zinc-800/60 bg-transparent">
              {MOCK_ACTIVITIES.slice(0, 5).map(activity => (
                <li key={activity.id} className="p-4 hover:bg-zinc-900/40 transition-colors">
                  <div className="flex space-x-3.5">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500/80 shadow-sm shadow-red-500"></div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-medium text-zinc-200 leading-snug">{activity.description}</span>
                      <span className="text-[10px] font-medium text-zinc-500 mt-1">{formatDate(activity.createdAt)}</span>
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
