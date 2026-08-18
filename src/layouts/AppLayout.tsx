import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Clock, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  Search,
  LogOut,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contractors', href: '/contractors', icon: Users },
    { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Expirations', href: '/expirations', icon: Clock },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f5] flex selection:bg-red-950 selection:text-red-200 antialiased">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#080808] border-r border-zinc-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 flex flex-col shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 bg-[#0a0a0f]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 p-[1px] shadow-md shadow-red-950/80 group-hover:shadow-red-600/30 transition-all">
              <div className="w-full h-full bg-[#09090c] rounded-[7px] flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-red-500 group-hover:text-red-400 transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-extrabold tracking-tight text-base text-white">
                  VERITY
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold -mt-0.5">
                Contractor Compliance
              </span>
            </div>
          </Link>
          <button 
            className="ml-auto lg:hidden text-zinc-400 hover:text-white p-1 rounded-md"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 relative",
                  isActive 
                    ? "bg-gradient-to-r from-red-950/60 via-red-950/30 to-transparent text-white border-l-2 border-red-500 shadow-[inset_0_1px_0_rgba(239,68,68,0.15)]" 
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-red-500" : "text-zinc-500")} />
                <span>{item.name}</span>
                {item.name === 'Expirations' && (
                  <span className="ml-auto px-1.5 py-0.2 rounded text-[10px] bg-red-950/80 border border-red-800/60 text-red-400 font-bold">
                    Alerts
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-zinc-800/80 bg-[#0a0a0f]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#101015] border border-zinc-800/80 hover:border-zinc-700 transition-colors">
            <div className="h-8.5 w-8.5 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-xs font-extrabold text-white shrink-0 shadow-md shadow-red-950/80">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user?.companyName || user?.email || 'General Contractor'}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#080808]/90 backdrop-blur-xl border-b border-zinc-800/80 sticky top-0 z-30 shadow-sm">
          <button
            className="lg:hidden text-zinc-400 hover:text-white p-2 rounded-lg bg-zinc-900 border border-zinc-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="relative max-w-md w-full hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search contractors, certificates, or trades..."
                className="block w-full pl-9 pr-3 py-1.5 border border-zinc-800 rounded-lg bg-[#0d0d12] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/50 sm:text-xs transition-all"
              />
            </div>
            <button className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors border border-transparent hover:border-zinc-800">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#050505]">
          <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
