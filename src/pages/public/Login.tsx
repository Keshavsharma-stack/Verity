import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const infoMessage = (location.state as any)?.message;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await signIn({
        email: email.trim(),
        password,
      });

      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Email or password is incorrect.');
      }
    } catch {
      setError('Email or password is incorrect.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Ambient Red Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[130px] pointer-events-none -z-0" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-gradient-to-b from-[#111117] to-[#09090d] border border-zinc-800/90 rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-950/80">
              <ShieldCheck className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Log in to Verity
            </h2>
            <p className="mt-2 text-xs text-zinc-400">
              Or{' '}
              <Link to="/signup" className="font-semibold text-red-400 hover:text-red-300 transition-colors">
                start your free 14-day trial
              </Link>
            </p>
          </div>

          {infoMessage && !error && (
            <div className="mb-6 rounded-xl bg-emerald-950/50 p-3.5 border border-emerald-700/60 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200 font-medium leading-relaxed">{infoMessage}</div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-950/50 p-3.5 border border-red-700/60 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin} noValidate>
            <div>
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={submitting}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={submitting}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="text-zinc-400 hover:text-zinc-200 focus:outline-none focus:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <div className="flex items-center pt-1">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-800 bg-black text-red-600 focus:ring-red-600 focus:ring-offset-black cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-zinc-400 cursor-pointer select-none">
                Remember this device
              </label>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
