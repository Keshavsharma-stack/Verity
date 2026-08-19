import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, SignUpParams, SignInParams } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;
  isRecoveryMode: boolean;
  isSupabaseConfigured: boolean;
  signIn: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
  });

  useEffect(() => {
    let isMounted = true;

    // Detect recovery tokens in URL on initial page load and route to /reset-password
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        (hash.includes('type=recovery') || search.includes('type=recovery')) &&
        !window.location.pathname.startsWith('/reset-password')
      ) {
        setIsRecoveryMode(true);
        window.location.replace(`/reset-password${hash}${search}`);
        return;
      }
    }

    // 1. Check existing session on load
    const initializeAuth = async () => {
      try {
        const { user: initialUser, session: initialSession } = await authService.getSession();
        if (!isMounted) return;

        if (initialSession?.user && initialUser) {
          setSession(initialSession);
          setUser(initialUser);
          if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            const hash = window.location.hash || '';
            const search = window.location.search || '';
            if (
              path === '/' ||
              path === '/login' ||
              path === '/signup' ||
              hash.includes('access_token') ||
              search.includes('type=signup') ||
              search.includes('type=email')
            ) {
              window.location.replace('/dashboard');
            }
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Subscribe to auth state changes (sign in, sign out, token refresh, recovery hash)
    const { unsubscribe } = authService.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(authService.mapUser(currentSession.user));
          setLoading(false);
        }
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/reset-password')) {
          window.location.replace(`/reset-password${window.location.hash || ''}${window.location.search || ''}`);
        }
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        // Provision or fetch full profile and workspace
        const resolvedUser = await authService.ensureUserWorkspaceAndProfile(currentSession.user);
        if (isMounted) {
          setUser(resolvedUser);
          setLoading(false);
        }
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          if (
            path === '/' ||
            path === '/login' ||
            path === '/signup' ||
            hash.includes('access_token') ||
            search.includes('type=signup') ||
            search.includes('type=email')
          ) {
            window.location.replace('/dashboard');
          }
        }
      } else if (event === 'SIGNED_OUT' || !currentSession) {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          setIsRecoveryMode(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (params: SignInParams) => {
    const result = await authService.signIn(params);
    if (result.user && result.session) {
      setUser(result.user);
      setSession(result.session);
      return { success: true };
    }
    return { success: false, error: result.error || 'Failed to sign in' };
  };

  const signUp = async (params: SignUpParams) => {
    const result = await authService.signUp(params);
    if (result.user) {
      if (result.session) {
        setUser(result.user);
        setSession(result.session);
        return { success: true, requiresEmailConfirmation: false };
      }
      return { success: true, requiresEmailConfirmation: true };
    }
    return { success: false, error: result.error || 'Failed to create account' };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    return authService.resetPasswordForEmail(email);
  };

  const updatePassword = async (password: string) => {
    return authService.updatePassword(password);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user && session),
    isRecoveryMode,
    isSupabaseConfigured: authService.isConfigured(),
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
