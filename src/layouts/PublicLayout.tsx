import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function PublicLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Platform', href: '/' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f5] font-sans selection:bg-red-950 selection:text-red-200 antialiased">
      {/* Top Ambient Obsidian & Subtle Red Light Bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-24 bg-gradient-to-b from-red-600/10 via-red-900/5 to-transparent blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-xl border-b border-zinc-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 p-[1px] shadow-md shadow-red-950/80 group-hover:shadow-red-600/30 transition-all">
                <div className="w-full h-full bg-[#09090c] rounded-[7px] flex items-center justify-center">
                  <ShieldCheck className="h-4.5 w-4.5 text-red-500 group-hover:text-red-400 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-base text-white">
                    VERITY
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                </div>
                <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase -mt-0.5">
                  Contractor Compliance
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`transition-colors duration-150 py-1 relative ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-zinc-900/80 transition-colors"
              >
                Sign In
              </Link>
              <Button size="sm" asChild>
                <Link to="/signup" className="flex items-center gap-1.5">
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="flex sm:hidden items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800"
              >
                Sign In
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-zinc-800 bg-[#0c0c10] px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    location.pathname === link.href
                      ? 'bg-red-950/50 text-white font-semibold border-l-2 border-red-500'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-zinc-800/80">
              <Button size="md" className="w-full" asChild>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <span>Start Free</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#080808] border-t border-zinc-800/80 py-14 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-10 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <span className="text-white font-bold text-sm tracking-tight">VERITY</span>
                <span className="text-zinc-500 text-xs block font-medium">Enterprise Contractor Compliance & Risk Intelligence</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-zinc-400 font-medium">
              <Link to="/" className="hover:text-white transition-colors">Platform</Link>
              <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/signup" className="hover:text-white transition-colors">Create Account</Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500 font-medium">
            <p>© {new Date().getFullYear()} Verity Compliance Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Security Audited</span>
              <span>•</span>
              <span>SOC2 Compliant Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
