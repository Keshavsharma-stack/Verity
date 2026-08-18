import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Work email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid work email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (formError) setFormError(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await signUp({
        fullName: formData.fullName,
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          setConfirmationSent(true);
        } else {
          navigate('/dashboard');
        }
      } else {
        setFormError(result.error || 'Unable to create your account right now. Please try again.');
      }
    } catch {
      setFormError('Unable to create your account right now. Please try again.');
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
              Create your Verity account
            </h2>
            <p className="mt-2 text-xs text-zinc-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-red-400 hover:text-red-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {formError && (
            <div className="mb-6 rounded-xl bg-red-950/50 p-3.5 border border-red-700/60 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200 font-medium leading-relaxed">{formError}</div>
            </div>
          )}

          {confirmationSent ? (
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-6 w-6 text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Account created successfully</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We've sent a verification link to <span className="text-red-300 font-semibold">{formData.email}</span>. Click the link to confirm your account and log in.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Proceed to Sign In</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSignup} noValidate>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Sarah Connor"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={submitting}
                  error={errors.fullName}
                />
              </div>

              <div>
                <Label htmlFor="companyName">Company / Organization</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  placeholder="Acme Construction Co."
                  value={formData.companyName}
                  onChange={handleChange}
                  disabled={submitting}
                  error={errors.companyName}
                />
              </div>

              <div>
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="sarah@acmeconstruction.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                  error={errors.email}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={submitting}
                  error={errors.password}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={submitting}
                  error={errors.confirmPassword}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Create account <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-center text-zinc-500 mt-4 leading-relaxed">
                By signing up, you agree to Verity's <Link to="/terms" className="text-red-400 hover:text-red-300 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-red-400 hover:text-red-300 hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
