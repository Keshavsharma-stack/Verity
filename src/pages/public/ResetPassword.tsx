import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, signOut, isRecoveryMode } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Link verification state
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Check if URL has explicit error from Supabase
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const fullUrlParams = new URLSearchParams(
      hash.startsWith('#') ? hash.substring(1) : search
    );

    const errorParam = fullUrlParams.get('error') || new URLSearchParams(search).get('error');
    const errorCode = fullUrlParams.get('error_code') || new URLSearchParams(search).get('error_code');

    if (errorParam || errorCode) {
      setIsLinkValid(false);
      setIsVerifying(false);
      return;
    }

    // Check if recovery tokens are explicitly in URL
    const hasRecoveryTokens =
      hash.includes('access_token') ||
      hash.includes('type=recovery') ||
      search.includes('code=') ||
      search.includes('token=') ||
      isRecoveryMode;

    const verifySession = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (session?.user) {
            setIsLinkValid(true);
            setIsVerifying(false);
            return;
          }
        } catch {
          // Continue to fallback
        }
      }

      if (hasRecoveryTokens) {
        // If recovery tokens are in URL, give Supabase a grace window to exchange/store tokens
        setTimeout(async () => {
          if (!isMounted) return;
          if (isSupabaseConfigured() && supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              setIsLinkValid(true);
            } else {
              setIsLinkValid(hasRecoveryTokens);
            }
          } else {
            setIsLinkValid(true);
          }
          setIsVerifying(false);
        }, 1200);
      } else {
        // If no tokens in URL and no active session
        setTimeout(async () => {
          if (!isMounted) return;
          if (isSupabaseConfigured() && supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              setIsLinkValid(true);
            } else {
              setIsLinkValid(false);
            }
          } else {
            setIsLinkValid(true);
          }
          setIsVerifying(false);
        }, 800);
      }
    };

    verifySession();

    // Listen for auth state changes
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (
          event === 'PASSWORD_RECOVERY' ||
          (event === 'SIGNED_IN' && session?.user) ||
          (event === 'INITIAL_SESSION' && session?.user)
        ) {
          setIsLinkValid(true);
          setIsVerifying(false);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isRecoveryMode]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const result = await updatePassword(password);
      if (result.success) {
        setSuccess(true);
        // Cleanly sign out the temporary recovery session so user logs in fresh with new password
        try {
          await signOut();
        } catch {
          // Ignore signOut failure on reset
        }
        // Redirect to /login after short delay
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: 'Password updated successfully. Please log in with your new password.' },
          });
        }, 2200);
      } else {
        setFormError(result.error || 'Unable to update password. Please try again.');
      }
    } catch {
      setFormError('Unable to update password right now. Please try again.');
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

          {/* 1. Verifying State */}
          {isVerifying ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-center mx-auto shadow-lg shadow-red-950/80">
                <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Verifying reset link...</h3>
                <p className="text-xs text-zinc-400">Authenticating secure password reset token</p>
              </div>
            </div>
          ) : !isLinkValid ? (
            /* 2. Invalid or Expired Link State */
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-700/60 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-950">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Invalid or Expired Link
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                  This password reset link is invalid or has expired.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Button className="w-full" asChild>
                  <Link to="/forgot-password">
                    <span>Request a new reset link</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <div>
                  <Link
                    to="/login"
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : success ? (
            /* 3. Password Updated Success State */
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Password updated successfully.
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your password has been changed. Redirecting to the sign in page...
                </p>
              </div>

              <div className="pt-2">
                <Button className="w-full" asChild>
                  <Link to="/login">
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* 4. Active Password Reset Form */
            <div>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-950/80">
                  <Lock className="h-6 w-6 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Set a new password
                </h2>
                <p className="mt-2 text-xs text-zinc-400">
                  Choose a new password for your Verity account.
                </p>
              </div>

              {formError && (
                <div className="mb-6 rounded-xl bg-red-950/50 p-3.5 border border-red-700/60 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-200 font-medium leading-relaxed">{formError}</div>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                      if (formError) setFormError(null);
                    }}
                    error={errors.password}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      if (formError) setFormError(null);
                    }}
                    error={errors.confirmPassword}
                    disabled={submitting}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password...
                      </span>
                    ) : (
                      'Update password'
                    )}
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
