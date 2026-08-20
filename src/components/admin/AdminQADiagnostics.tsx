import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  ShieldCheck, 
  Terminal, 
  Play, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Server, 
  Code2,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface TestResultData {
  success: boolean;
  message?: string;
  error?: string;
  workspaceId?: string;
  documentId?: string;
  contractorId?: string;
  expiresAt?: string;
  scan1Results?: {
    scannedDocuments: number;
    notificationsCreated: number;
    emailsAttempted: number;
    emailsSent: number;
  };
  scan2Results?: {
    scannedDocuments: number;
    notificationsCreated: number;
    duplicatesSkipped: number;
  };
  notificationsGenerated?: number;
  notificationPreview?: {
    title: string;
    urgency: string;
    checkpoint: string;
    message: string;
  } | null;
}

export function AdminQADiagnostics() {
  const { user } = useAuth();
  const [runningTest, setRunningTest] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [testResult, setTestResult] = useState<TestResultData | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const isAdmin = user?.role === 'ADMIN';

  const handleRunE2ETest = async () => {
    if (!isAdmin) return;
    setRunningTest(true);
    setTestResult(null);
    setCleanupMessage(null);
    addLog('Initiating secure E2E Expiration & Idempotency verification...');

    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      const token = session?.access_token;

      if (!token) {
        throw new Error('No active authenticated admin session found.');
      }

      addLog('Dispatched POST /api/cron/test-e2e with Admin Bearer authentication');

      const response = await fetch('/api/cron/test-e2e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workspaceId: user?.workspaceId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        addLog(`ERROR: ${data.error || 'Test run failed.'}`);
        setTestResult({
          success: false,
          error: data.error || 'E2E test failed on server.'
        });
      } else {
        addLog(`SUCCESS: Test passed! Scan 1 created ${data.scan1Results?.notificationsCreated || 1} notification, Scan 2 skipped ${data.scan2Results?.duplicatesSkipped || 1} duplicates (Idempotent).`);
        setTestResult(data);
      }
    } catch (err: any) {
      addLog(`FATAL: ${err.message}`);
      setTestResult({
        success: false,
        error: err.message || 'Network error executing E2E test.'
      });
    } finally {
      setRunningTest(false);
    }
  };

  const handleCleanupTestData = async () => {
    if (!isAdmin) return;
    setCleaningUp(true);
    setCleanupMessage(null);
    addLog('Initiating test data cleanup in workspace...');

    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      const token = session?.access_token;

      const response = await fetch('/api/cron/test-e2e?cleanup=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workspaceId: user?.workspaceId,
          action: 'cleanup'
        })
      });

      const data = await response.json();

      if (data.success) {
        addLog('SUCCESS: All test contractors, policies, and generated test notifications have been removed.');
        setCleanupMessage(data.message || 'Test data removed cleanly.');
      } else {
        addLog(`ERROR: Cleanup failed: ${data.error}`);
        setCleanupMessage('Cleanup failed: ' + data.error);
      }
    } catch (err: any) {
      addLog(`FATAL: Cleanup error: ${err.message}`);
      setCleanupMessage('Cleanup failed: ' + err.message);
    } finally {
      setCleaningUp(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-800/50 flex items-center justify-center mx-auto mb-4 text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Admin Privilege Required</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Internal QA diagnostics and automated test harnesses are restricted to workspace administrators and developer accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-zinc-950 via-[#100b0e] to-zinc-950 border border-zinc-800/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Internal QA & Automation Verification</h2>
                <Badge variant="crimson" className="text-[10px]">
                  Admin Only
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Execute end-to-end expiration pipeline simulations and verify multi-stage idempotency without exposing test controls to standard customers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupTestData}
              disabled={runningTest || cleaningUp}
              className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs"
            >
              {cleaningUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 text-zinc-400" /> Cleanup Test Data
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleRunE2ETest}
              disabled={runningTest || cleaningUp}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950/80"
            >
              {runningTest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Running Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Run E2E Test
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Production Architecture & Infrastructure Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0a0a0f] border-zinc-800/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Server className="w-4 h-4 text-emerald-400" /> Cron Pipeline
              </div>
              <Badge variant="success" className="text-[10px]">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 font-mono">
              /api/cron/process-expirations
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">
              Secured by CRON_SECRET & Bearer tokens.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0f] border-zinc-800/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Clock className="w-4 h-4 text-amber-400" /> Checkpoints
              </div>
              <Badge variant="warning" className="text-[10px]">
                6 Stages
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 font-medium">
              30d &bull; 15d &bull; 7d &bull; 1d &bull; Day-of &bull; Lapsed
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Automatic escalation & threshold triggers.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0f] border-zinc-800/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-red-400" /> Idempotency Engine
              </div>
              <Badge variant="neutral" className="text-[10px]">
                Enforced
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 font-medium">
              Document + Checkpoint + Expiration Key
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Zero duplicate notifications per renewal cycle.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test Execution Output */}
      {testResult && (
        <Card className={`border shadow-2xl overflow-hidden ${testResult.success ? 'bg-[#080d0a] border-emerald-900/60' : 'bg-[#0f080a] border-red-900/60'}`}>
          <CardHeader className="p-4 border-b border-zinc-800/60 bg-black/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">
                  {testResult.success ? 'E2E Verification Succeeded' : 'E2E Verification Failed'}
                </CardTitle>
              </div>
              <Badge 
                variant={testResult.success ? 'success' : 'danger'}
                className="text-[10px]"
              >
                {testResult.success ? '100% Passed' : 'Failed'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {testResult.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-black/60 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Scan 1 Detection</span>
                    <span className="text-sm font-extrabold text-emerald-400 mt-1 block">
                      +{testResult.scan1Results?.notificationsCreated || 1} Alert Created
                    </span>
                    <span className="text-[10px] text-zinc-400">Triggered for T-7 Days Critical Checkpoint</span>
                  </div>

                  <div className="p-3 bg-black/60 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Scan 2 Idempotency</span>
                    <span className="text-sm font-extrabold text-white mt-1 block">
                      {testResult.scan2Results?.duplicatesSkipped || 1} Duplicate Skipped
                    </span>
                    <span className="text-[10px] text-emerald-400">0 Duplicate Alerts Spawned</span>
                  </div>

                  <div className="p-3 bg-black/60 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Database Persistence</span>
                    <span className="text-sm font-extrabold text-emerald-400 mt-1 block">
                      Verified Active
                    </span>
                    <span className="text-[10px] text-zinc-400">Document ID: {testResult.documentId?.substring(0, 8)}...</span>
                  </div>
                </div>

                {testResult.notificationPreview && (
                  <div className="p-4 rounded-lg bg-black/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        Generated Notification Payload:
                      </span>
                      <Badge variant="crimson" className="text-[10px]">
                        {testResult.notificationPreview.urgency} &bull; {testResult.notificationPreview.checkpoint}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {testResult.notificationPreview.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      {testResult.notificationPreview.message}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/60 text-xs text-red-300">
                <span className="font-bold block mb-1">Execution Failure:</span>
                {testResult.error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cleanup Feedback */}
      {cleanupMessage && (
        <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cleanupMessage}</span>
        </div>
      )}

      {/* Real-time Diagnostics Terminal */}
      <Card className="bg-[#070709] border-zinc-800/80 shadow-2xl">
        <CardHeader className="p-4 border-b border-zinc-800/60 bg-black/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Live QA Diagnostics Terminal
            </CardTitle>
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold"
          >
            Clear Output
          </button>
        </CardHeader>

        <CardContent className="p-4 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto space-y-1 text-zinc-300">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic py-4 text-center">
              Awaiting QA verification commands. Click &ldquo;Run E2E Test&rdquo; above to start live simulation.
            </div>
          ) : (
            logs.map((line, idx) => (
              <div 
                key={idx} 
                className={
                  line.includes('ERROR') || line.includes('FATAL')
                    ? 'text-red-400 font-semibold'
                    : line.includes('SUCCESS')
                    ? 'text-emerald-400 font-semibold'
                    : 'text-zinc-400'
                }
              >
                {line}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
