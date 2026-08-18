import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Please enter your work email.');
      return;
    } else if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Unable to process password reset.');
      }
    } catch {
      setError('Unable to process password reset right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Ambient Red Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[130px] pointer-events-none -z-0" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-gradient-to-b from-[#111117] to-[#09090d] border border-zinc-800/90 rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-950/80">
              <ShieldCheck className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Reset your password
            </h2>
            <p className="mt-2 text-xs text-zinc-400">
              Enter your email and we'll send you instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-950/50 p-3.5 border border-red-700/60 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-6 w-6 text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Reset link dispatched</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  If an account exists for <span className="text-red-300 font-semibold">{email}</span>, you will receive an email with reset instructions shortly.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="sarah@acmeconstruction.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={submitting}
                />
              </div>

              <div className="pt-1">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset link...
                    </span>
                  ) : (
                    'Send reset instructions'
                  )}
                </Button>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
