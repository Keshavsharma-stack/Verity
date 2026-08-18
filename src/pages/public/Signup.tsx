import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck } from 'lucide-react';

export function Signup() {
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock signup, redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Start your free trial
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-emerald-500 hover:text-emerald-400">
              Log in
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                name="company"
                type="text"
                required
                placeholder="Acme Construction"
              />
            </div>
            <div>
              <Label htmlFor="email-address">Work Email</Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </div>
          <p className="text-xs text-center text-zinc-500 mt-4">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
}
