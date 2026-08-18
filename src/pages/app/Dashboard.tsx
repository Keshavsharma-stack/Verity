import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Users, ShieldAlert, AlertTriangle, CheckCircle, FileText, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { documentService } from '../../services/api';
import { contractorService } from '../../services/contractorService';
import { evaluateExpiration } from '../../lib/expiration';
import { complianceService } from '../../services/complianceService';
import { Contractor, Document, ComplianceGateResult } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface ActivityItem {
  id: string;
  description: string;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [gateResults, setGateResults] = useState<Map<string, ComplianceGateResult>>(new Map());
  const [urgentDocs, setUrgentDocs] = useState<Document[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      if (!user?.workspaceId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [conRes, docsRes, gateRes] = await Promise.all([
        contractorService.listContractors(user.workspaceId),
        documentService.listDocuments(user.workspaceId),
        complianceService.evaluateWorkspaceCompliance(user.workspaceId),
      ]);

      let acts: ActivityItem[] = [];
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: actRows } = await supabase
            .from('activities')
            .select('id, description, created_at')
            .eq('workspace_id', user.workspaceId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (actRows) {
            acts = actRows;
          }
        } catch {
          // ignore
        }
      }

      if (isMounted) {
        setContractors(conRes.data || []);
        setGateResults(gateRes.data || new Map());
        
        // Filter and sort urgent expiring / expired docs
        const allDocs = docsRes.data || [];
        const urgent = allDocs.filter(d => {
          if (!d.expiresAt) return false;
          const exp = evaluateExpiration(d.expiresAt);
          return exp.isExpired || (exp.daysRemaining !== null && exp.daysRemaining <= 30);
        });

        urgent.sort((a, b) => {
          const expA = evaluateExpiration(a.expiresAt);
          const expB = evaluateExpiration(b.expiresAt);
          if (expA.daysRemaining === null) return 1;
          if (expB.daysRemaining === null) return -1;
          return expA.daysRemaining - expB.daysRemaining;
        });

        setUrgentDocs(urgent);
        setActivities(acts);
        setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.workspaceId]);

  const totalCount = contractors.length;
  
  // Calculate real metrics directly from compliance gate results
  let compliantCount = 0;
  let expiringCount = 0;
  let nonCompliantCount = 0;

  if (contractors.length > 0) {
    for (const c of contractors) {
      const gate = gateResults.get(c.id);
      if (gate) {
        if (gate.status === 'READY') {
          if (gate.expiringCount > 0) expiringCount++;
          else compliantCount++;
        } else if (gate.status === 'NOT_READY') {
          nonCompliantCount++;
        } else if (gate.status === 'REVIEW_REQUIRED') {
          nonCompliantCount++;
        }
      } else {
        if (c.status === 'COMPLIANT') compliantCount++;
        else if (c.status === 'EXPIRING') expiringCount++;
        else nonCompliantCount++;
      }
    }
  }

  const stats = [
    { name: 'Total Contractors', value: totalCount, icon: Users, color: 'text-zinc-300', accent: 'bg-zinc-600', glow: '' },
    { name: 'Compliant', value: compliantCount, icon: CheckCircle, color: 'text-emerald-400', accent: 'bg-emerald-500', glow: '' },
    { name: 'Expiring Soon', value: expiringCount, icon: AlertTriangle, color: 'text-amber-400', accent: 'bg-amber-500', glow: '' },
    { name: 'Action Required', value: nonCompliantCount, icon: ShieldAlert, color: 'text-red-400', accent: 'bg-red-500', glow: 'border-red-950/80 bg-red-950/10' },
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
            ) : urgentDocs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-medium">All contractor documents are up to date.</div>
            ) : (
              <ul className="divide-y divide-zinc-800/60 bg-transparent">
                {urgentDocs.slice(0, 5).map(doc => {
                  const con = contractors.find(c => c.id === doc.contractorId);
                  const exp = evaluateExpiration(doc.expiresAt);
                  return (
                    <li key={doc.id} className="p-4 hover:bg-zinc-900/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-100">{doc.name}</span>
                          <span className="text-[11px] font-medium text-zinc-400 mt-0.5">{con?.companyName || 'Contractor'}</span>
                        </div>
                        <div className="text-right">
                          <Badge variant={exp.badgeVariant} className="text-[10px] px-2 py-0.5 font-bold tracking-wider uppercase">
                            {exp.humanReadable}
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
            {activities.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-medium">No recent audit log entries recorded.</div>
            ) : (
              <ul className="divide-y divide-zinc-800/60 bg-transparent">
                {activities.map(activity => (
                  <li key={activity.id} className="p-4 hover:bg-zinc-900/40 transition-colors">
                    <div className="flex space-x-3.5">
                      <div className="mt-1">
                        <div className="w-2 h-2 rounded-full bg-red-500/80 shadow-sm shadow-red-500"></div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-xs font-medium text-zinc-200 leading-snug">{activity.description}</span>
                        <span className="text-[10px] font-medium text-zinc-500 mt-1">{formatDate(activity.created_at)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
