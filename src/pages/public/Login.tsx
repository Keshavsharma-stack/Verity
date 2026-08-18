import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ShieldCheck } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login, redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Log in to your account
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Or{' '}
            <Link to="/signup" className="font-medium text-emerald-500 hover:text-emerald-400">
              start your free trial
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
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
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-600"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-400">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-emerald-500 hover:text-emerald-400">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
