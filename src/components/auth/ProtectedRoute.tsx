import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center text-zinc-400 p-4">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-[#101015] to-[#09090d] border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center shadow-lg shadow-red-950/80">
            <ShieldCheck className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex items-center gap-2.5 text-sm text-zinc-300 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
