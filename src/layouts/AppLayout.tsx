import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contractors', href: '/contractors', icon: Users },
    { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Expirations', href: '/expirations', icon: Clock },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:shrink-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <Link to="/" className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-semibold text-white tracking-tight">Verity</span>
          </Link>
          <button 
            className="ml-auto lg:hidden text-zinc-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-zinc-800 text-white" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-500" : "text-zinc-500")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-medium text-white">
              SC
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Sarah Connor</p>
              <p className="text-xs text-zinc-500 truncate">Acme Construction</p>
            </div>
            <LogOut className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-30">
          <button
            className="lg:hidden text-zinc-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="relative max-w-md w-full hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search contractors or documents..."
                className="block w-full pl-10 pr-3 py-1.5 border border-zinc-800 rounded-md leading-5 bg-zinc-950 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-colors"
              />
            </div>
            <button className="relative text-zinc-400 hover:text-white transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-900" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
