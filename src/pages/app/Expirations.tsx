import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { documentService } from '../../services/documentService';
import { contractorService } from '../../services/contractorService';
import { reminderService } from '../../services/reminderService';
import { notificationService } from '../../services/notificationService';
import { evaluateExpiration } from '../../lib/expiration';
import { Document, Contractor, ExpirationStatusCategory, Reminder } from '../../types';
import { formatDate } from '../../lib/utils';
import { AlertCircle, Clock, XCircle, Send, ShieldAlert, CheckCircle2, Filter, Loader2, RefreshCw, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type ExpirationFilter = 'ALL' | 'EXPIRED' | 'CRITICAL' | 'UPCOMING' | 'ACTIVE' | 'PERMANENT';

interface RenewalNotificationState {
  type: 'success' | 'info' | 'error';
  message: string;
}

export function Expirations() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ExpirationFilter>('ALL');
  const [dispatchingDocId, setDispatchingDocId] = useState<string | null>(null);
  const [renewalStatusMap, setRenewalStatusMap] = useState<Record<string, 'SENT' | 'PENDING' | 'SCHEDULED' | 'FAILED'>>({});
  const [notification, setNotification] = useState<RenewalNotificationState | null>(null);

  const loadData = async () => {
    if (!user?.workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [docsRes, conRes, remindersRes] = await Promise.all([
      documentService.listDocuments(user.workspaceId),
      contractorService.listContractors(user.workspaceId),
      reminderService.listReminders(user.workspaceId),
    ]);

    setDocuments(docsRes.data || []);
    setContractors(conRes.data || []);

    // Trigger background expiration sync
    notificationService.triggerExpirationScan(user.workspaceId).catch(() => {});

    // Hydrate existing renewal requests directly from the database
    const initialMap: Record<string, 'SENT' | 'PENDING' | 'SCHEDULED' | 'FAILED'> = {};
    if (remindersRes.data) {
      for (const rem of remindersRes.data) {
        if (rem.documentId) {
          if (rem.checkpoint === 'MANUAL_REQUEST' || rem.status === 'SENT' || rem.status === 'PENDING') {
            initialMap[rem.documentId] = rem.status === 'SENT' ? 'SENT' : 'PENDING';
          }
        }
      }
    }
    setRenewalStatusMap(initialMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.workspaceId]);

  const handleRequestRenewal = async (doc: Document, contractor?: Contractor) => {
    if (!user?.workspaceId || !contractor) return;

    setDispatchingDocId(doc.id);
    setNotification(null);

    const res = await reminderService.sendManualRenewalRequest(
      user.workspaceId,
      doc.id,
      contractor.id,
      doc.name
    );
    setDispatchingDocId(null);

    if (res.success) {
      if (res.emailSent) {
        setRenewalStatusMap(prev => ({ ...prev, [doc.id]: 'SENT' }));
        setNotification({
          type: 'success',
          message: `Renewal email dispatched successfully to ${res.recipientEmail || contractor.email} for ${doc.name}.`,
        });
      } else {
        setRenewalStatusMap(prev => ({ ...prev, [doc.id]: 'PENDING' }));
        setNotification({
          type: 'info',
          message: `Renewal request recorded in database for ${contractor.companyName} (${doc.name}). Email delivery pending (Email service not configured in server environment).`,
        });
      }
    } else {
      setNotification({
        type: 'error',
        message: res.error || 'Failed to dispatch renewal request.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-zinc-500 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-500" />
        <span>Loading real expiration radar data...</span>
      </div>
    );
  }

  // Calculate metrics based on centralized evaluation
  const evaluatedDocs = documents.map(doc => ({
    doc,
    contractor: contractors.find(c => c.id === doc.contractorId),
    exp: evaluateExpiration(doc.expiresAt),
  }));

  const expiredCount = evaluatedDocs.filter(d => d.exp.isExpired).length;
  const criticalCount = evaluatedDocs.filter(d => !d.exp.isExpired && d.exp.daysRemaining !== null && d.exp.daysRemaining <= 7).length;
  const upcomingCount = evaluatedDocs.filter(d => !d.exp.isExpired && d.exp.daysRemaining !== null && d.exp.daysRemaining <= 30).length;
  const activeCount = evaluatedDocs.filter(d => !d.exp.isExpired && d.exp.daysRemaining !== null && d.exp.daysRemaining > 30).length;
  const permanentCount = evaluatedDocs.filter(d => d.exp.category === 'NO_EXPIRATION_DATE').length;

  const filteredItems = evaluatedDocs.filter(item => {
    if (activeFilter === 'ALL') {
      return item.exp.category !== 'NO_EXPIRATION_DATE';
    }
    if (activeFilter === 'EXPIRED') {
      return item.exp.isExpired;
    }
    if (activeFilter === 'CRITICAL') {
      return !item.exp.isExpired && item.exp.daysRemaining !== null && item.exp.daysRemaining <= 7;
    }
    if (activeFilter === 'UPCOMING') {
      return !item.exp.isExpired && item.exp.daysRemaining !== null && item.exp.daysRemaining <= 30;
    }
    if (activeFilter === 'ACTIVE') {
      return !item.exp.isExpired && item.exp.daysRemaining !== null && item.exp.daysRemaining > 30;
    }
    if (activeFilter === 'PERMANENT') {
      return item.exp.category === 'NO_EXPIRATION_DATE';
    }
    return true;
  });

  // Sort by urgency: expired first (most overdue first), then closest upcoming expiration
  filteredItems.sort((a, b) => {
    if (a.exp.daysRemaining === null) return 1;
    if (b.exp.daysRemaining === null) return -1;
    return a.exp.daysRemaining - b.exp.daysRemaining;
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Expiration Radar & Renewal Center</h1>
          <p className="text-xs font-medium text-zinc-400 mt-1">Automatic 30/15/7/1-day risk monitoring and automated subcontractor document requests.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Radar
        </Button>
      </div>

      {/* Real-time Notification Banner */}
      {notification && (
        <div 
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : notification.type === 'info'
              ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
              : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : notification.type === 'info' ? (
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">
            {notification.message}
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-zinc-400 hover:text-zinc-200 text-xs font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Critical Expirations (&le; 7 Days)</p>
                <p className="text-3xl font-extrabold text-amber-400 mt-0.5">{criticalCount}</p>
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Upcoming Expirations (&le; 30 Days)</p>
                <p className="text-3xl font-extrabold text-white mt-0.5">{upcomingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Radar Card */}
      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-400">
              Live Expiration Radar
            </CardTitle>
          </div>

          {/* Expiration Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              All Tracked
            </button>
            <button
              onClick={() => setActiveFilter('EXPIRED')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeFilter === 'EXPIRED' ? 'bg-red-950 text-red-300 border border-red-800/60' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Expired ({expiredCount})
            </button>
            <button
              onClick={() => setActiveFilter('CRITICAL')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeFilter === 'CRITICAL' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Critical &le; 7d ({criticalCount})
            </button>
            <button
              onClick={() => setActiveFilter('UPCOMING')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeFilter === 'UPCOMING' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Upcoming &le; 30d ({upcomingCount})
            </button>
            <button
              onClick={() => setActiveFilter('ACTIVE')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeFilter === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Active &gt; 30d ({activeCount})
            </button>
            <button
              onClick={() => setActiveFilter('PERMANENT')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeFilter === 'PERMANENT' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Permanent ({permanentCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-black/40">
                <th className="p-4">Document Title</th>
                <th className="p-4">Contractor</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4">Status & Radar Urgency</th>
                <th className="p-4 text-right">Renewal Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-xs text-zinc-500 bg-transparent">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                    {activeFilter === 'EXPIRED' 
                      ? 'No expired policies in your workspace.'
                      : activeFilter === 'CRITICAL'
                      ? 'No policies expiring within the next 7 days.'
                      : activeFilter === 'UPCOMING'
                      ? 'No policies expiring within the next 30 days.'
                      : activeFilter === 'ACTIVE'
                      ? 'No active policies beyond 30 days.'
                      : 'All contractor documents in your workspace are active and up to date.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map(({ doc, contractor, exp }) => {
                  const status = renewalStatusMap[doc.id];
                  const isSent = status === 'SENT';
                  const isPending = status === 'PENDING';
                  const isRequested = isSent || isPending;
                  const isDispatching = dispatchingDocId === doc.id;

                  return (
                    <tr key={doc.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="p-4 font-bold text-zinc-100">{doc.name}</td>
                      <td className="p-4 text-zinc-300">
                        {contractor ? (
                          <Link to={`/contractors/${contractor.id}`} className="hover:text-red-400 font-semibold transition-colors">
                            {contractor.companyName}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 text-zinc-300">
                        <div className="font-semibold">{doc.expiresAt ? formatDate(doc.expiresAt) : 'Permanent Record'}</div>
                        <div className={`text-[11px] mt-0.5 font-bold ${exp.isExpired ? 'text-red-400' : exp.isExpiringSoon ? 'text-amber-400' : 'text-zinc-400'}`}>
                          {exp.humanReadable}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={exp.badgeVariant} 
                          className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider"
                        >
                          {exp.category === 'EXPIRED' ? 'LAPSED / EXPIRED' :
                           exp.category === 'EXPIRING_7_DAYS' ? 'CRITICAL (≤7d)' :
                           (exp.category === 'EXPIRING_15_DAYS' || exp.category === 'EXPIRING_30_DAYS') ? 'UPCOMING (≤30d)' :
                           exp.category === 'ACTIVE' ? 'ACTIVE (>30d)' :
                           'PERMANENT'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`transition-colors ${
                            isSent 
                              ? 'border-emerald-800/80 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/40' 
                              : isPending
                              ? 'border-amber-800/80 bg-amber-950/30 text-amber-300 hover:bg-amber-950/40'
                              : 'hover:border-red-500/60 hover:text-white'
                          }`}
                          disabled={isRequested || isDispatching}
                          onClick={() => handleRequestRenewal(doc, contractor)}
                        >
                          {isDispatching ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" /> Recording...
                            </span>
                          ) : isSent ? (
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Email Dispatched
                            </span>
                          ) : isPending ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" /> Renewal Requested
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Send className="w-3 h-3 text-red-500" /> Request Renewal
                            </span>
                          )}
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
