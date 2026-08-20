import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Building2, Users, CreditCard, CheckCircle2, Check, Loader2, Cpu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AdminQADiagnostics } from '../../components/admin/AdminQADiagnostics';

export function Settings() {
  const location = useLocation();
  const { user } = useAuth();

  if (location.pathname === '/settings') {
    return <Navigate to="/settings/company" replace />;
  }

  const links = [
    { name: 'Company Profile', to: '/settings/company', icon: Building2 },
    { name: 'Team Members', to: '/settings/team', icon: Users },
    { name: 'Billing & Plans', to: '/settings/billing', icon: CreditCard },
  ];

  // Internal QA & Automation Diagnostics strictly reserved for Admin/Developer users
  if (user?.role === 'ADMIN') {
    links.push({ name: 'QA Diagnostics', to: '/settings/qa', icon: Cpu });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organization Settings</h1>
        <p className="text-xs font-medium text-zinc-400 mt-1">Manage enterprise profile, permissions, and billing plan.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full md:w-60 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-950/70 to-red-950/20 text-white border-l-2 border-red-500 shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-white border-l-2 border-transparent'
                }`
              }
            >
              <link.icon className="w-4 h-4 text-red-500" />
              <span>{link.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function SettingsCompany() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState(user?.companyName || 'Acme Construction & Engineering');
  const [industry, setIndustry] = useState('Commercial & Industrial General Contracting');
  const [hq, setHq] = useState('100 Enterprise Plaza, Suite 400, Chicago, IL');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (isSupabaseConfigured() && supabase && user?.id) {
        // Update profile
        await supabase
          .from('profiles')
          .update({
            company_name: companyName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        // Update workspace if user owns it
        if (user.workspaceId) {
          await supabase
            .from('workspaces')
            .update({
              name: companyName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.workspaceId);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Gracefully handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
      <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
        <CardTitle className="text-sm font-bold text-zinc-200">Company Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label htmlFor="companyName">General Contractor Legal Name</Label>
          <Input 
            id="companyName"
            type="text" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="industry">Industry Sector</Label>
          <Input 
            id="industry"
            type="text" 
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hq">Headquarters Address</Label>
          <Input 
            id="hq"
            type="text" 
            value={hq}
            onChange={(e) => setHq(e.target.value)}
          />
        </div>
        <div className="pt-4 flex items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Saved
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
          {saved && <span className="text-xs text-emerald-400 font-medium">Company information updated successfully</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsTeam() {
  const { user } = useAuth();

  return (
    <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
      <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
        <CardTitle className="text-sm font-bold text-zinc-200">Authorized Team Members</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3.5">
          {/* Active User Record */}
          <div className="flex items-center justify-between p-3.5 border border-red-900/40 rounded-xl bg-red-950/10">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                {user?.name || 'Primary Administrator'}
                <span className="text-[10px] text-zinc-400 font-normal">(You)</span>
              </p>
              <p className="text-[11px] text-zinc-400">{user?.email || 'admin@veritycompliance.com'}</p>
            </div>
            <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800/60 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {user?.role === 'ADMIN' ? 'Owner / Admin' : user?.role || 'Admin'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 border border-zinc-800 rounded-xl bg-zinc-950/80">
            <div>
              <p className="text-xs font-bold text-white">Michael Chang</p>
              <p className="text-[11px] text-zinc-400">mchang@veritycompliance.com</p>
            </div>
            <span className="text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Safety Inspector
            </span>
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm">
              + Invite Team Member
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsBilling() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [sub, setSub] = React.useState<{ plan: string; status: string; isTrial: boolean } | null>(null);
  const [usage, setUsage] = React.useState<any>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.workspaceId) return;

    import('../../services/billingService').then(({ billingService }) => {
      Promise.all([
        billingService.getWorkspaceSubscription(user.workspaceId!),
        billingService.getWorkspaceUsage(user.workspaceId!)
      ]).then(([subData, usageData]) => {
        setSub(subData);
        setUsage(usageData);
        setLoading(false);
      });
    });
  }, [user]);

  const handleUpgrade = async (planSlug: string) => {
    if (!user?.workspaceId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workspaceId: user.workspaceId,
          planSlug
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error initiating checkout');
      setActionLoading(false);
    }
  };

  const handleManagePortal = async () => {
    if (!user?.workspaceId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workspaceId: user.workspaceId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer portal session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error opening billing portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  const currentPlan = sub?.plan.toUpperCase() || 'FREE';
  const isFree = currentPlan === 'FREE';

  return (
    <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
      <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-zinc-200">Active Subscription & Invoicing</CardTitle>
        <span className="text-[10px] bg-red-950/80 border border-red-800/60 text-red-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
          Stripe Secured Billing
        </span>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="p-5 border-2 border-red-500/60 rounded-2xl bg-gradient-to-b from-[#181014] to-[#0c090c] shadow-[0_0_25px_rgba(239,68,68,0.15)] relative">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Current Plan</span>
              <h3 className="text-xl font-bold text-white">Verity {currentPlan}</h3>
            </div>
            <span className="text-xs bg-red-950 border border-red-700/60 text-red-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {sub?.status || 'Active'}
            </span>
          </div>

          <p className="text-sm text-zinc-400 mb-5">
            {isFree ? 'Free tier (Up to 5 contractors, 20 documents, 10 AI extractions)' : `Active ${currentPlan} commercial subscription`}
          </p>
          
          <ul className="text-xs text-zinc-300 space-y-2.5 mb-6">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>
                Contractors: {usage?.contractors.current} / {usage?.contractors.limit === null ? 'Unlimited' : usage?.contractors.limit}
                {usage?.contractors.hasReachedLimit && <span className="text-red-400 ml-2 font-bold">(Limit Reached)</span>}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>
                Documents: {usage?.documents.current} / {usage?.documents.limit === null ? 'Unlimited' : usage?.documents.limit}
                {usage?.documents.hasReachedLimit && <span className="text-red-400 ml-2 font-bold">(Limit Reached)</span>}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>
                AI Extractions: {usage?.aiExtractions.current} / {usage?.aiExtractions.limit === null ? 'Unlimited' : usage?.aiExtractions.limit}
                {usage?.aiExtractions.hasReachedLimit && <span className="text-red-400 ml-2 font-bold">(Limit Reached)</span>}
              </span>
            </li>
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            {isFree ? (
              <>
                <Button 
                  onClick={() => handleUpgrade('STARTER')} 
                  disabled={actionLoading}
                  className="text-xs"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Upgrade to Starter ($49/mo)
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleUpgrade('PRO')} 
                  disabled={actionLoading}
                  className="text-xs border-red-500/50 text-red-400 hover:bg-red-950/40"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Upgrade to Pro ($99/mo)
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleManagePortal} 
                disabled={actionLoading}
                className="text-xs"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Manage Billing & Invoicing (Stripe Portal)
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-xs text-zinc-500 space-y-1">
          <p>🔒 All payments and subscriptions are securely processed by Stripe. Checkout sessions require workspace administrator privileges.</p>
          <p>Environment requirement status: <code className="text-zinc-400">STRIPE_SECRET_KEY</code>, <code className="text-zinc-400">STRIPE_WEBHOOK_SECRET</code>, <code className="text-zinc-400">STRIPE_PRICE_ID_STARTER</code>, <code className="text-zinc-400">STRIPE_PRICE_ID_PRO</code>.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsAdminQA() {
  return <AdminQADiagnostics />;
}

