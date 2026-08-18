import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck } from 'lucide-react';

export function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-emerald-500 hover:text-emerald-400">
              Log in
            </Link>
          </p>
        </div>
        
        {submitted ? (
          <div className="rounded-md bg-emerald-500/10 p-4 border border-emerald-500/20">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-emerald-400">Instructions sent</h3>
                <div className="mt-2 text-sm text-emerald-500/80">
                  <p>Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.</p>
                </div>
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link to="/login">Back to log in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <Label htmlFor="email-address">Email address</Label>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
