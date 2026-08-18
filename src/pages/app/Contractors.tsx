import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
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
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Contractors</h1>
          <p className="text-[13px] font-medium text-zinc-500 mt-1">Manage your contractors and view their compliance status.</p>
        </div>
        <Button className="bg-zinc-100 text-zinc-900 hover:bg-white shadow-sm" asChild>
          <Link to="/contractors/new"><Plus className="w-4 h-4 mr-2" /> Add Contractor</Link>
        </Button>
      </div>

      <Card className="bg-zinc-900/40 border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-800/60 flex flex-col sm:flex-row gap-4 justify-between bg-zinc-950/20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search by company or trade..." 
              className="pl-9 bg-zinc-950/50 border-zinc-800/80 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="sm:w-auto w-full bg-zinc-900/50 border-zinc-800">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800/60 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-950/30">
                <th className="p-4 font-semibold">Company</th>
                <th className="p-4 font-semibold">Trade</th>
                <th className="p-4 font-semibold">Compliance Status</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Last Updated</th>
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-[14px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] font-medium text-zinc-500 bg-zinc-950/10">Loading contractors...</td>
                </tr>
              ) : filteredContractors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] font-medium text-zinc-500 bg-zinc-950/10">No contractors found.</td>
                </tr>
              ) : (
                filteredContractors.map((contractor) => (
                  <tr key={contractor.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="p-4">
                      <div className="font-semibold text-zinc-200">{contractor.companyName}</div>
                      <div className="text-zinc-500 text-[12px] font-medium mt-0.5">{contractor.contractorType}</div>
                    </td>
                    <td className="p-4 text-zinc-300 font-medium">{contractor.trade}</td>
                    <td className="p-4">
                      <Badge status={contractor.status} className="text-[10px] px-2 py-0.5 font-semibold tracking-wider uppercase" />
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-zinc-300 text-[13px]">{contractor.primaryContact}</div>
                      <div className="text-zinc-500 text-[12px] font-medium mt-0.5">{contractor.email}</div>
                    </td>
                    <td className="p-4 text-zinc-400 text-[13px] font-medium">{formatDate(contractor.lastUpdated)}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white">
                        <Link to={`/contractors/${contractor.id}`}>View Passport</Link>
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
