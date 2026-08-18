import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Search, Plus, Filter, ArrowRight, Building2, AlertCircle } from 'lucide-react';
import { contractorService } from '../../services/contractorService';
import { complianceService } from '../../services/complianceService';
import { Contractor, ComplianceGateResult } from '../../types';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export function Contractors() {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [gateResults, setGateResults] = useState<Map<string, ComplianceGateResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;

    async function loadContractors() {
      if (!user?.workspaceId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const [res, gateRes] = await Promise.all([
        contractorService.listContractors(user.workspaceId),
        complianceService.evaluateWorkspaceCompliance(user.workspaceId),
      ]);
      if (isMounted) {
        if (res.error) {
          setError(res.error);
        } else {
          setContractors(res.data);
          setGateResults(gateRes.data || new Map());
        }
        setLoading(false);
      }
    }

    loadContractors();

    return () => {
      isMounted = false;
    };
  }, [user?.workspaceId]);

  const filteredContractors = contractors.filter(c => {
    const matchesSearch = 
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.trade.toLowerCase().includes(search.toLowerCase()) ||
      c.primaryContact.toLowerCase().includes(search.toLowerCase());
    
    const gate = gateResults.get(c.id);
    const effectiveStatus = gate 
      ? (gate.status === 'READY' ? (gate.expiringCount > 0 ? 'EXPIRING' : 'COMPLIANT') : gate.status === 'NOT_READY' ? 'NON_COMPLIANT' : 'PENDING_REVIEW')
      : c.status;

    const matchesStatus = statusFilter === 'ALL' || effectiveStatus === statusFilter || (gate && gate.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contractor Directory</h1>
          <p className="text-xs font-medium text-zinc-400 mt-1">Manage verified subcontractors, track trade compliance, and review passport documents.</p>
        </div>
        <Button asChild>
          <Link to="/contractors/new"><Plus className="w-4 h-4 mr-2" /> Add Contractor</Link>
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row gap-4 justify-between bg-zinc-950/60 items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search by company or trade..." 
              className="pl-9 bg-black/70 border-zinc-800 focus:ring-red-500/50 focus:border-red-500/60"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-zinc-800 bg-black/80 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-red-500/60"
            >
              <option value="ALL">All Compliance Statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="EXPIRING">Expiring</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="PENDING_REVIEW">Pending Review</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-black/40">
                <th className="p-4">Company</th>
                <th className="p-4">Trade</th>
                <th className="p-4">Compliance Status</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">Loading contractors...</td>
                </tr>
              ) : contractors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center bg-transparent">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-3 border border-zinc-800">
                        <Building2 className="w-5 h-5 text-zinc-500" />
                      </div>
                      <p className="text-zinc-200 text-sm font-semibold mb-1">No contractors in directory</p>
                      <p className="text-zinc-500 text-xs mb-4">Register your first subcontractor or trade partner to initiate passport tracking.</p>
                      <Button size="sm" asChild>
                        <Link to="/contractors/new"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Contractor</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredContractors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">No contractors match your search criteria.</td>
                </tr>
              ) : (
                filteredContractors.map((contractor) => {
                  const gate = gateResults.get(contractor.id);
                  const displayStatus = gate 
                    ? (gate.status === 'READY' ? (gate.expiringCount > 0 ? 'EXPIRING' : 'READY') : gate.status)
                    : contractor.status;

                  return (
                    <tr key={contractor.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-zinc-100">{contractor.companyName}</div>
                        <div className="text-zinc-400 text-[11px] font-medium mt-0.5">{contractor.contractorType}</div>
                      </td>
                      <td className="p-4 text-zinc-300 font-semibold">{contractor.trade}</td>
                      <td className="p-4">
                        <Badge status={displayStatus} className="text-[10px] px-2 py-0.5 font-bold tracking-wider uppercase" />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-zinc-200 text-xs">{contractor.primaryContact}</div>
                        <div className="text-zinc-400 text-[11px] font-medium mt-0.5">{contractor.email}</div>
                      </td>
                      <td className="p-4 text-zinc-400 text-xs font-medium">{formatDate(contractor.lastUpdated)}</td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" asChild className="text-zinc-300 hover:text-white hover:border-red-500/60">
                          <Link to={`/contractors/${contractor.id}`}>
                            <span>View Passport</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
