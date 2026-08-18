import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Search, Plus, Filter, ArrowRight } from 'lucide-react';
import { contractorService } from '../../services/api';
import { Contractor } from '../../types';
import { formatDate } from '../../lib/utils';

export function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    contractorService.getContractors().then(data => {
      setContractors(data);
      setLoading(false);
    });
  }, []);

  const filteredContractors = contractors.filter(c => 
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.trade.toLowerCase().includes(search.toLowerCase())
  );

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

      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row gap-4 justify-between bg-zinc-950/60">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search by company or trade..." 
              className="pl-9 bg-black/70 border-zinc-800 focus:ring-red-500/50 focus:border-red-500/60"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="sm:w-auto w-full">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
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
              ) : filteredContractors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-medium text-zinc-500 bg-transparent">No contractors found.</td>
                </tr>
              ) : (
                filteredContractors.map((contractor) => (
                  <tr key={contractor.id} className="hover:bg-zinc-900/40 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-zinc-100">{contractor.companyName}</div>
                      <div className="text-zinc-400 text-[11px] font-medium mt-0.5">{contractor.contractorType}</div>
                    </td>
                    <td className="p-4 text-zinc-300 font-semibold">{contractor.trade}</td>
                    <td className="p-4">
                      <Badge status={contractor.status} className="text-[10px] px-2 py-0.5 font-bold tracking-wider uppercase" />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
