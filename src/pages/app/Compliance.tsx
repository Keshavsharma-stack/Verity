import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Download, Search, ArrowUpRight, Building2, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { contractorService } from '../../services/contractorService';
import { complianceService } from '../../services/complianceService';
import { Contractor, ComplianceGateResult, RequirementEvaluation } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export function Compliance() {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [gateResults, setGateResults] = useState<Map<string, ComplianceGateResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'READY' | 'EXPIRING' | 'NOT_READY' | 'REVIEW_REQUIRED'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user?.workspaceId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [res, gateRes] = await Promise.all([
        contractorService.listContractors(user.workspaceId),
        complianceService.evaluateWorkspaceCompliance(user.workspaceId),
      ]);

      if (isMounted) {
        setContractors(res.data || []);
        setGateResults(gateRes.data || new Map());
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.workspaceId]);

  const filtered = contractors.filter(c => {
    const gate = gateResults.get(c.id);
    const gateStatus = gate ? (gate.status === 'READY' && gate.expiringCount > 0 ? 'EXPIRING' : gate.status) : c.status;
    
    const matchesFilter = filter === 'ALL' || gateStatus === filter || (filter === 'READY' && gate?.status === 'READY');
    const matchesSearch = c.companyName.toLowerCase().includes(search.toLowerCase()) || c.trade.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate high-fidelity compliance metrics
  let compliantCount = 0;
  let expiringCount = 0;
  let nonCompliantCount = 0;
  let reviewRequiredCount = 0;

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
          reviewRequiredCount++;
        }
      } else {
        if (c.status === 'COMPLIANT') compliantCount++;
        else if (c.status === 'EXPIRING') expiringCount++;
        else nonCompliantCount++;
      }
    }
  }

  const totalEvaluated = contractors.length;
  const complianceRate = totalEvaluated > 0 ? Math.round((compliantCount / totalEvaluated) * 100) : 100;

  function renderRequirementCell(reqEval?: RequirementEvaluation) {
    if (!reqEval || !reqEval.required) {
      return <span className="text-zinc-500 font-medium">N/A</span>;
    }

    if (reqEval.status === 'SATISFIED') {
      return (
        <span className="text-emerald-400 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Active
        </span>
      );
    }

    if (reqEval.status === 'EXPIRING') {
      return (
        <span className="text-amber-400 font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {reqEval.daysRemaining !== null && reqEval.daysRemaining !== undefined ? `${reqEval.daysRemaining}d` : 'Expiring'}
        </span>
      );
    }

    if (reqEval.status === 'MANUAL_REVIEW_REQUIRED') {
      return (
        <span className="text-amber-300 font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Review Req.
        </span>
      );
    }

    if (reqEval.status === 'EXPIRED') {
      return (
        <span className="text-red-400 font-bold flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5" /> Expired
        </span>
      );
    }

    if (reqEval.status === 'DEFICIENT') {
      return (
        <span className="text-red-400 font-bold flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Deficient
        </span>
      );
    }

    return (
      <span className="text-red-400 font-bold flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5" /> Missing
      </span>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Risk Matrix</h1>
          <p className="text-xs font-medium text-zinc-400 mt-1">Audit job site readiness, aggregate risk, and track compliance certifications.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export Audit Report
          </Button>
          <Button asChild>
            <Link to="/contractors/new">Add Contractor</Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-b from-[#121218] to-[#09090d] border-zinc-800/90 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <CardContent className="p-5 pl-6">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              Overall Compliance Score
              <ShieldCheck className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-extrabold text-white">{complianceRate}%</div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full" style={{ width: `${complianceRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-[#121218] to-[#09090d] border-zinc-800/90 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardContent className="p-5 pl-6">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              Site-Approved (Ready)
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">{compliantCount}</div>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium">All requirements verified & active</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-[#121218] to-[#09090d] border-zinc-800/90 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardContent className="p-5 pl-6">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              Upcoming Expirations
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{expiringCount}</div>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium">Lapsing within 30 calendar days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-[#1a0e12] to-[#0d090c] border-red-950/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
          <CardContent className="p-5 pl-6">
            <div className="text-[10px] font-bold text-red-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              Site Blocked / Review
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-extrabold text-red-400">{nonCompliantCount + reviewRequiredCount}</div>
            <p className="text-[10px] text-red-400/70 mt-2 font-medium">Immediate site access prohibited</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row gap-4 justify-between bg-zinc-950/60 items-center">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'READY', 'EXPIRING', 'NOT_READY', 'REVIEW_REQUIRED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === tab 
                    ? 'bg-red-950/80 text-red-200 border border-red-700/60 shadow-sm' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search contractor or trade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-zinc-800 rounded-lg bg-black/70 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/50"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-black/40">
                <th className="p-4">Subcontractor Entity</th>
                <th className="p-4">Trade</th>
                <th className="p-4">Gate Status</th>
                <th className="p-4">GL Insurance</th>
                <th className="p-4">Workers Comp</th>
                <th className="p-4">Trade License</th>
                <th className="p-4 text-right">Passport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-xs">Loading matrix...</td>
                </tr>
              ) : contractors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500 text-xs">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                    No contractors registered in your workspace. Add a contractor to begin tracking compliance.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-xs">No contractors match the current filter.</td>
                </tr>
              ) : (
                filtered.map(contractor => {
                  const gate = gateResults.get(contractor.id);
                  const displayStatus = gate 
                    ? (gate.status === 'READY' ? (gate.expiringCount > 0 ? 'EXPIRING' : 'READY') : gate.status)
                    : contractor.status;

                  const glReq = gate?.requirements.find(r => r.requirementId === 'insuranceRequired');
                  const wcReq = gate?.requirements.find(r => r.requirementId === 'workersCompRequired');
                  const licReq = gate?.requirements.find(r => r.requirementId === 'professionalLicenseRequired' || r.requirementId === 'businessLicenseRequired');

                  return (
                    <tr key={contractor.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-zinc-100">{contractor.companyName}</div>
                        <div className="text-zinc-500 text-[11px] font-medium mt-0.5">{contractor.primaryContact}</div>
                      </td>
                      <td className="p-4 text-zinc-300 font-semibold">{contractor.trade}</td>
                      <td className="p-4">
                        <Badge status={displayStatus} className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider" />
                      </td>
                      <td className="p-4">
                        {renderRequirementCell(glReq)}
                      </td>
                      <td className="p-4">
                        {renderRequirementCell(wcReq)}
                      </td>
                      <td className="p-4">
                        {renderRequirementCell(licReq)}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-red-400">
                          <Link to={`/contractors/${contractor.id}`}>
                            <span>View</span>
                            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
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
