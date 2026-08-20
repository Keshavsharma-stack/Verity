import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Info, 
  ExternalLink, 
  Send, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import { reminderService } from '../services/reminderService';
import { AppNotification } from '../types';
import { cn } from '../lib/utils';

export function NotificationBellDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspaceId = user?.workspaceId || '';

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!workspaceId) return;
    if (!silent) setLoading(true);
    try {
      const res = await notificationService.getNotifications(workspaceId, { limit: 50 });
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workspaceId]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (workspaceId) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 30000); // 30s polling
      return () => clearInterval(interval);
    }
  }, [workspaceId, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleRead = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    if (!workspaceId) return;
    const newReadState = !notif.read;
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: newReadState } : n));
    setUnreadCount(prev => newReadState ? Math.max(0, prev - 1) : prev + 1);

    await notificationService.markAsRead(notif.id, workspaceId, newReadState);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workspaceId) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    await notificationService.markAllAsRead(workspaceId);
  };

  const handleScanExpirations = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workspaceId || scanning) return;
    setScanning(true);
    try {
      await notificationService.triggerExpirationScan(workspaceId);
      await fetchNotifications(false);
    } catch (err) {
      console.error('Expiration scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleRequestRenewal = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    if (!workspaceId || !notif.documentId || !notif.contractorId) return;
    
    setActionInProgressId(notif.id);
    setActionFeedback(null);

    try {
      const res = await reminderService.sendManualRenewalRequest(
        workspaceId,
        notif.documentId,
        notif.contractorId,
        notif.documentName
      );

      if (res.success) {
        setActionFeedback({
          id: notif.id,
          message: res.emailSent ? 'Renewal request email sent' : 'Renewal request saved (Email pending config)',
          isError: false,
        });
        // Auto mark as read on action
        if (!notif.read) {
          handleToggleRead(e, notif);
        }
      } else {
        setActionFeedback({
          id: notif.id,
          message: res.error || 'Failed to dispatch renewal request',
          isError: true,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        id: notif.id,
        message: err?.message || 'Error sending request',
        isError: true,
      });
    } finally {
      setActionInProgressId(null);
      setTimeout(() => {
        setActionFeedback(prev => prev?.id === notif.id ? null : prev);
      }, 5000);
    }
  };

  const handleNavigate = (url?: string) => {
    if (url) {
      navigate(url);
      setIsOpen(false);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeFilter === 'UNREAD') return !notif.read;
    if (activeFilter === 'CRITICAL') return notif.urgency === 'CRITICAL';
    return true;
  });

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
      case 'WARNING':
        return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800/60">Critical</span>;
      case 'WARNING':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">Warning</span>;
      default:
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">Info</span>;
    }
  };

  const getEmailBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Email Sent
          </span>
        );
      case 'NOT_CONFIGURED':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-medium" title="Server email infrastructure not configured in environment">
            <Mail className="h-3 w-3 text-zinc-500" /> Email Pending Config
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-medium">
            <AlertCircle className="h-3 w-3" /> Email Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="notification-bell-container">
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 text-zinc-400 hover:text-white rounded-lg transition-colors border",
          isOpen ? "bg-zinc-800 text-white border-zinc-700" : "hover:bg-zinc-900 border-transparent hover:border-zinc-800"
        )}
        aria-label="Open notifications menu"
        title="Notifications & Expiration Alerts"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span 
            id="notification-badge-count"
            className="absolute -top-1 -right-1 flex h-4.5 min-w-[1.125rem] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-black animate-in fade-in zoom-in duration-200"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 md:w-[420px] bg-[#0c0c11] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800 bg-[#09090d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-scan-expirations"
                onClick={handleScanExpirations}
                disabled={scanning}
                title="Scan document expirations now"
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin text-red-400")} />
              </button>

              {unreadCount > 0 && (
                <button
                  id="btn-mark-all-read"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-zinc-800/80 bg-[#07070a] px-3 pt-2 gap-2 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={cn(
                "pb-2 px-2 font-medium transition-colors border-b-2",
                activeFilter === 'ALL'
                  ? "border-red-500 text-white font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={cn(
                "pb-2 px-2 font-medium transition-colors border-b-2",
                activeFilter === 'UNREAD'
                  ? "border-red-500 text-white font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              )}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter('CRITICAL')}
              className={cn(
                "pb-2 px-2 font-medium transition-colors border-b-2",
                activeFilter === 'CRITICAL'
                  ? "border-red-500 text-white font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              )}
            >
              Critical ({notifications.filter(n => n.urgency === 'CRITICAL').length})
            </button>
          </div>

          {/* Notification List Body */}
          <div className="overflow-y-auto divide-y divide-zinc-800/60 max-h-[380px] bg-[#0c0c11]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center text-zinc-500 gap-2">
                <CheckCircle2 className="h-8 w-8 text-zinc-600 mb-1" />
                <p className="text-sm font-medium text-zinc-300">All clear</p>
                <p className="text-xs text-zinc-500 max-w-[240px]">
                  {activeFilter === 'UNREAD' 
                    ? 'No unread notifications right now.'
                    : activeFilter === 'CRITICAL'
                    ? 'No critical expiration alerts.'
                    : 'No notifications generated for this workspace yet.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  id={`notification-item-${notif.id}`}
                  className={cn(
                    "p-3.5 transition-colors flex flex-col gap-2 relative group",
                    notif.read ? "bg-[#0c0c11] hover:bg-[#111118]" : "bg-[#14141d]/70 hover:bg-[#171722]"
                  )}
                >
                  {/* Top row: Urgency badge, title, and mark-read button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getUrgencyBadge(notif.urgency)}
                      <span className="text-xs font-semibold text-zinc-200 line-clamp-1">
                        {notif.documentName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleToggleRead(e, notif)}
                        className={cn(
                          "p-1 rounded transition-colors text-[11px]",
                          notif.read ? "text-zinc-500 hover:text-zinc-300" : "text-red-400 hover:text-red-300 bg-red-950/40"
                        )}
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                      >
                        {notif.read ? <Check className="h-3.5 w-3.5" /> : <div className="h-2 w-2 rounded-full bg-red-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Contractor & Message */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className="font-medium text-zinc-300">{notif.contractorName}</span>
                      {notif.expirationDate && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[11px] text-zinc-400">
                            Exp: {new Date(notif.expirationDate).toISOString().split('T')[0]}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300/90 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Email Status & Meta */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <div>
                      {getEmailBadge(notif.emailStatus)}
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Action feedback toast */}
                  {actionFeedback && actionFeedback.id === notif.id && (
                    <div className={cn(
                      "p-2 rounded text-xs font-medium flex items-center justify-between animate-in fade-in duration-150",
                      actionFeedback.isError ? "bg-red-950/80 text-red-300 border border-red-800" : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                    )}>
                      <span>{actionFeedback.message}</span>
                      <button onClick={() => setActionFeedback(null)} className="p-0.5 hover:opacity-80">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/40">
                    {notif.contractorId && (
                      <button
                        onClick={() => handleNavigate(notif.actionUrl || `/contractors/${notif.contractorId}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                        <span>View Contractor</span>
                      </button>
                    )}

                    {notif.documentId && notif.contractorId && (
                      <button
                        onClick={(e) => handleRequestRenewal(e, notif)}
                        disabled={actionInProgressId === notif.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-800/50 text-xs font-medium transition-colors disabled:opacity-50 ml-auto"
                      >
                        {actionInProgressId === notif.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin text-red-400" />
                        ) : (
                          <Send className="h-3 w-3 text-red-400" />
                        )}
                        <span>Request Renewal</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-zinc-800 bg-[#09090d] flex items-center justify-between text-xs">
            <Link
              to="/expirations"
              onClick={() => setIsOpen(false)}
              className="text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1 hover:underline px-1"
            >
              Open Expiration Radar &rarr;
            </Link>
            <span className="text-zinc-500 text-[11px]">Real-time Expiration Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
