import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Loader2, Beaker, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function TestPipelineUI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async (action: 'execute' | 'cleanup') => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      if (!token) throw new Error('Authentication token required');

      const res = await fetch('/api/dev/e2e-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute test');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#0a0a0f] border-orange-900/40 shadow-2xl mt-6">
      <CardHeader className="bg-orange-950/20 border-b border-orange-900/40">
        <CardTitle className="text-sm font-bold text-orange-400 flex items-center gap-2">
          <Beaker className="w-4 h-4" />
          E2E Notification Pipeline Test
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <p className="text-xs text-zinc-400">
          This test securely injects a mock contractor and a test document expiring in exactly 7 days, executes the core expiration scanner (simulating the Vercel Cron execution), and verifies that idempotency and critical urgency mappings are successfully preserved.
        </p>

        <div className="flex gap-3">
          <Button 
            onClick={() => runTest('execute')} 
            disabled={loading}
            className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Run End-to-End Pipeline
          </Button>
          <Button 
            variant="outline"
            onClick={() => runTest('cleanup')} 
            disabled={loading}
            className="text-xs border-zinc-700 text-zinc-300"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Safe Cleanup Records
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto text-xs font-mono text-zinc-300">
            <div className="flex items-center gap-2 text-emerald-400 mb-3 font-sans font-bold">
              <CheckCircle className="w-4 h-4" />
              {result.message}
            </div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
