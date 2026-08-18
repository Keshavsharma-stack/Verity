import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';

export function Settings() {
  const location = useLocation();

  if (location.pathname === '/settings') {
    return <Navigate to="/settings/company" replace />;
  }

  const links = [
    { name: 'Company Profile', to: '/settings/company' },
    { name: 'Team Members', to: '/settings/team' },
    { name: 'Billing & Plans', to: '/settings/billing' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your workspace, team, and billing preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                }`
              }
            >
              {link.name}
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
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Company Name</label>
          <input 
            type="text" 
            defaultValue="Acme Construction" 
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Industry</label>
          <input 
            type="text" 
            defaultValue="General Contracting" 
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="pt-4">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Save Changes
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsTeam() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-md">
            <div>
              <p className="text-sm font-medium text-white">Sarah Connor</p>
              <p className="text-xs text-zinc-400">admin@acmeconstruction.com</p>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">Admin</span>
          </div>
          <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Invite Member
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsBilling() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 border border-zinc-800 rounded-md bg-zinc-900/50">
            <h3 className="text-lg font-medium text-white mb-1">Pro Plan</h3>
            <p className="text-sm text-zinc-400 mb-4">$149 / month</p>
            <ul className="text-sm text-zinc-300 space-y-2 mb-4">
              <li>✓ Up to 250 Contractors</li>
              <li>✓ 2,500 Documents</li>
              <li>✓ 10 Team Members</li>
            </ul>
            <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Manage Subscription
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
