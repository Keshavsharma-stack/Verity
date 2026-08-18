import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 text-zinc-100 hover:text-white transition-colors group">
              <ShieldCheck className="h-5 w-5 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
              <span className="font-medium tracking-tight text-sm">Verity</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="text-zinc-400 hover:text-white transition-colors">Product</Link>
              <Link to="/" className="text-zinc-400 hover:text-white transition-colors">How It Works</Link>
              <Link to="/pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                Log In
              </Link>
              <Link to="/signup" className="text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 rounded transition-colors shadow-sm">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-zinc-950 border-t border-zinc-900 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-600" />
            <span className="text-zinc-500 font-medium text-sm">Verity</span>
          </div>
          <p className="text-zinc-500 text-xs font-medium">
            © {new Date().getFullYear()} Verity. Built for operational teams.
          </p>
        </div>
      </footer>
    </div>
  );
}
