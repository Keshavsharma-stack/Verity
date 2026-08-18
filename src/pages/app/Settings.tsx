import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Building2, Users, CreditCard, CheckCircle2 } from 'lucide-react';

export function Settings() {
  const location = useLocation();

  if (location.pathname === '/settings') {
    return <Navigate to="/settings/company" replace />;
  }

  const links = [
    { name: 'Company Profile', to: '/settings/company', icon: Building2 },
    { name: 'Team Members', to: '/settings/team', icon: Users },
    { name: 'Billing & Plans', to: '/settings/billing', icon: CreditCard },
  ];

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
            defaultValue="Acme Construction & Engineering" 
          />
        </div>
        <div>
          <Label htmlFor="industry">Industry Sector</Label>
          <Input 
            id="industry"
            type="text" 
            defaultValue="Commercial & Industrial General Contracting" 
          />
        </div>
        <div>
          <Label htmlFor="hq">Headquarters Address</Label>
          <Input 
            id="hq"
            type="text" 
            defaultValue="100 Enterprise Plaza, Suite 400, Chicago, IL" 
          />
        </div>
        <div className="pt-4">
          <Button type="button">
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsTeam() {
  return (
    <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
      <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
        <CardTitle className="text-sm font-bold text-zinc-200">Authorized Team Members</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between p-3.5 border border-zinc-800 rounded-xl bg-zinc-950/80">
            <div>
              <p className="text-xs font-bold text-white">Sarah Connor</p>
              <p className="text-[11px] text-zinc-400">sarah@acmeconstruction.com</p>
            </div>
            <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800/60 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Super Admin
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 border border-zinc-800 rounded-xl bg-zinc-950/80">
            <div>
              <p className="text-xs font-bold text-white">Michael Chang</p>
              <p className="text-[11px] text-zinc-400">mchang@acmeconstruction.com</p>
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
  return (
    <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
      <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
        <CardTitle className="text-sm font-bold text-zinc-200">Active Subscription & Invoicing</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="p-5 border-2 border-red-500/60 rounded-2xl bg-gradient-to-b from-[#181014] to-[#0c090c] shadow-[0_0_25px_rgba(239,68,68,0.15)] relative">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Current Plan</span>
              <h3 className="text-xl font-bold text-white">Verity Pro Plan</h3>
            </div>
            <span className="text-xs bg-red-950 border border-red-700/60 text-red-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Active
            </span>
          </div>

          <p className="text-sm text-zinc-400 mb-5">$149 / month (Next billing on Sept 1, 2026)</p>
          
          <ul className="text-xs text-zinc-300 space-y-2.5 mb-6">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>Up to 250 Active Subcontractors</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>2,500 Digital Compliance Documents Storage</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>10 Safety Director & Admin Accounts</span>
            </li>
          </ul>

          <Button variant="outline" className="text-xs">
            Manage Subscription & Payment Method
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
