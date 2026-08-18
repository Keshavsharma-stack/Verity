import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock, Share2, Lock, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Contractor, Document } from '../../types';

interface CompliancePassportCardProps {
  contractor: Contractor;
  documents?: Document[];
  className?: string;
  isDemo?: boolean;
}

export function CompliancePassportCard({
  contractor,
  documents = [],
  className = '',
  isDemo = false,
}: CompliancePassportCardProps) {
  const [copied, setCopied] = React.useState(false);

  // Group document counts
  const validDocs = documents.filter((d) => d.status === 'VALID').length;
  const expiringDocs = documents.filter((d) => d.status === 'EXPIRING').length;
  const expiredDocs = documents.filter((d) => d.status === 'EXPIRED').length;
  const pendingDocs = documents.filter((d) => d.status === 'PENDING_REVIEW').length;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `VERITY Compliance Passport: ${contractor.companyName} — Status: ${contractor.status}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return {
          border: 'border-emerald-500/60',
          bg: 'bg-emerald-950/40',
          text: 'text-emerald-400',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          badgeVariant: 'success' as const,
          label: 'COMPLIANT & APPROVED',
          gateText: 'Authorized for Job Site Access',
        };
      case 'EXPIRING':
        return {
          border: 'border-amber-500/60',
          bg: 'bg-amber-950/40',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          badgeVariant: 'warning' as const,
          label: 'EXPIRING SOON',
          gateText: 'Renewal Action Required',
        };
      case 'NON_COMPLIANT':
      default:
        return {
          border: 'border-red-500/60',
          bg: 'bg-red-950/50',
          text: 'text-red-400',
          glow: 'shadow-[0_0_25px_rgba(239,68,68,0.2)]',
          badgeVariant: 'danger' as const,
          label: 'NON-COMPLIANT',
          gateText: 'Entry Restricted — Critical Documents Missing/Expired',
        };
    }
  };

  const statusInfo = getStatusColor(contractor.status);

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-[#111117] via-[#0d0d12] to-[#07070a] border border-zinc-800/90 shadow-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-xl ${statusInfo.glow} ${className}`}
    >
      {/* Top Red Accent Light Stripe */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444]" />

      {isDemo && (
        <div className="absolute top-4 right-5 px-2.5 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
          DEMO DATA
        </div>
      )}

      {/* Header: Title & Brand */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-800 p-[1px] shadow-lg shadow-red-950/80 shrink-0">
            <div className="w-full h-full bg-[#09090c] rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-400">
                Verity Digital Passport
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <span className="text-xs text-zinc-400 font-mono">
                ID: VRT-{contractor.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              {contractor.companyName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="text-xs text-zinc-300 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-zinc-400 mr-1.5" />
                <span>Share Passport</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Status & Gate Pass Banner */}
      <div className="my-6 p-4 rounded-xl bg-[#09090d] border border-zinc-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Badge
            variant={statusInfo.badgeVariant}
            className="text-xs font-bold px-3 py-1 uppercase tracking-wider"
          >
            {statusInfo.label}
          </Badge>
          <div>
            <div className="text-xs font-semibold text-zinc-200">Site Gate Status</div>
            <div className={`text-xs font-medium ${statusInfo.text}`}>
              {statusInfo.gateText}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-400">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Primary Trade</span>
            <span className="text-zinc-200 font-semibold">{contractor.trade || 'General'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Contact</span>
            <span className="text-zinc-200 font-semibold">{contractor.primaryContact}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Last Verified</span>
            <span className="text-zinc-200 font-semibold">
              {new Date(contractor.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Document Credential Matrix Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-center">
          <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Valid</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{validDocs}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Approved COIs</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-center">
          <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Expiring</span>
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{expiringDocs}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">&lt; 30 Days Left</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-center">
          <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Expired</span>
          </div>
          <div className="text-xl font-bold text-red-400 mt-1">{expiredDocs}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Requires Renewal</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-center">
          <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>In Review</span>
          </div>
          <div className="text-xl font-bold text-zinc-300 mt-1">{pendingDocs}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Pending Intake</div>
        </div>
      </div>

      {/* Footer Security Seal */}
      <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-500 shrink-0" />
          <span>Verity Authenticated Contractor Ledger • Immutable Verification Record</span>
        </div>
        <div className="text-zinc-500 text-[11px]">
          Email: <span className="text-zinc-300">{contractor.email}</span>
        </div>
      </div>
    </div>
  );
}
