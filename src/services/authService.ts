import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, SignUpParams, SignInParams } from '../types';

export function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function mapSupabaseUser(sbUser: any, profile?: any, workspaceId?: string, role?: string): User {
  const meta = sbUser?.user_metadata || {};
  const validWs = isValidUUID(workspaceId) ? workspaceId : (isValidUUID(meta.workspace_id) ? meta.workspace_id : (isSupabaseConfigured() ? '' : `ws_${(sbUser?.id || 'default').substring(0, 8)}`));
  return {
    id: sbUser?.id || '',
    email: sbUser?.email || '',
    name: profile?.full_name || meta.full_name || meta.name || sbUser?.email?.split('@')[0] || 'User',
    companyName: profile?.company_name || meta.company_name || 'Acme Construction',
    workspaceId: validWs,
    role: (role as 'ADMIN' | 'MEMBER' | 'VIEWER') || (meta.role as 'ADMIN' | 'MEMBER' | 'VIEWER') || 'ADMIN',
  };
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  mapUser(sbUser: any, profile?: any, workspaceId?: string, role?: string): User {
    return mapSupabaseUser(sbUser, profile, workspaceId, role);
  },

  /**
   * Ensures that profile, workspace, and workspace_members records exist
   * for the authenticated user, and returns the populated User model.
   * Completely idempotent: will not create duplicate workspaces or memberships.
   */
  async ensureUserWorkspaceAndProfile(sbUser: any): Promise<User> {
    if (!sbUser || !sbUser.id) {
      return mapSupabaseUser(sbUser);
    }

    if (!isSupabaseConfigured() || !supabase) {
      return mapSupabaseUser(sbUser);
    }

    try {
      const meta = sbUser.user_metadata || {};
      const fullName = meta.full_name || meta.name || sbUser.email?.split('@')[0] || 'User';
      const defaultCompanyName = meta.company_name || 'My Organization';

      // 1. Check or create Profile
      let profileData: any = null;
      try {
        const { data: existingProfile, error: profileSelectError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (!profileSelectError && existingProfile) {
          profileData = existingProfile;
        } else {
          // Upsert profile record
          const { data: insertedProfile } = await supabase
            .from('profiles')
            .upsert(
              {
                id: sbUser.id,
                email: sbUser.email,
                full_name: fullName,
                company_name: defaultCompanyName,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            )
            .select()
            .maybeSingle();

          profileData = insertedProfile || { full_name: fullName, company_name: defaultCompanyName };
        }
      } catch {
        profileData = { full_name: fullName, company_name: defaultCompanyName };
      }

      const activeCompanyName = profileData?.company_name || defaultCompanyName;

      // 2. Check or create Workspace & Membership (Idempotent Multi-Tenant Resolution)
      let resolvedWorkspaceId: string | null = null;
      let resolvedRole = 'ADMIN';
      let resolvedWorkspaceName = activeCompanyName;

      try {
        // Step A: Check for existing membership in workspace_members (pure select without nested embedding)
        const { data: memberRows, error: memberSelectError } = await supabase
          .from('workspace_members')
          .select('workspace_id, role')
          .eq('user_id', sbUser.id)
          .order('created_at', { ascending: true });

        if (!memberSelectError && memberRows && memberRows.length > 0) {
          for (const m of memberRows) {
            if (isValidUUID(m.workspace_id)) {
              resolvedWorkspaceId = m.workspace_id;
              resolvedRole = m.role || 'ADMIN';
              break;
            }
          }

          if (resolvedWorkspaceId) {
            try {
              const { data: wsData } = await supabase
                .from('workspaces')
                .select('id, name')
                .eq('id', resolvedWorkspaceId)
                .maybeSingle();

              if (wsData?.name) {
                resolvedWorkspaceName = wsData.name;
              }
            } catch {
              // Non-fatal, use company name
            }
          }
        }

        // Step B: Check if user owns an existing workspace in workspaces table
        if (!resolvedWorkspaceId) {
          const { data: ownedWorkspaces, error: ownedSelectError } = await supabase
            .from('workspaces')
            .select('id, name, plan, owner_id')
            .eq('owner_id', sbUser.id)
            .order('created_at', { ascending: true });

          if (!ownedSelectError && ownedWorkspaces && ownedWorkspaces.length > 0) {
            for (const ow of ownedWorkspaces) {
              if (isValidUUID(ow.id)) {
                resolvedWorkspaceId = ow.id;
                resolvedWorkspaceName = ow.name || activeCompanyName;
                resolvedRole = 'ADMIN';
                break;
              }
            }

            if (resolvedWorkspaceId) {
              // Ensure workspace_members record exists for this owned workspace
              try {
                await supabase
                  .from('workspace_members')
                  .upsert(
                    {
                      workspace_id: resolvedWorkspaceId,
                      user_id: sbUser.id,
                      role: 'ADMIN',
                    },
                    { onConflict: 'workspace_id,user_id' }
                  );
              } catch {
                // Non-fatal if upsert has constraint or RLS block
              }
            }
          }
        }

        // Step C: User is not member of or owner of any workspace; create new workspace
        if (!resolvedWorkspaceId) {
          const { data: newWorkspace, error: wsError } = await supabase
            .from('workspaces')
            .insert({
              name: activeCompanyName,
              owner_id: sbUser.id,
              plan: 'FREE',
            })
            .select('id, name, plan, owner_id')
            .maybeSingle();

          if (!wsError && newWorkspace?.id && isValidUUID(newWorkspace.id)) {
            resolvedWorkspaceId = newWorkspace.id;
            resolvedWorkspaceName = newWorkspace.name;
            resolvedRole = 'ADMIN';

            // Create workspace_members record
            try {
              await supabase
                .from('workspace_members')
                .upsert(
                  {
                    workspace_id: newWorkspace.id,
                    user_id: sbUser.id,
                    role: 'ADMIN',
                  },
                  { onConflict: 'workspace_id,user_id' }
                );
            } catch {
              // Non-fatal
            }
          }
        }

        // Step D: Fallback to metadata if valid UUID is present
        if (!resolvedWorkspaceId && isValidUUID(meta.workspace_id)) {
          resolvedWorkspaceId = meta.workspace_id;
        }
      } catch {
        // Fallback gracefully if workspaces or workspace_members tables are not accessible
        if (!resolvedWorkspaceId && isValidUUID(meta.workspace_id)) {
          resolvedWorkspaceId = meta.workspace_id;
        }
      }

      const finalWsId = isValidUUID(resolvedWorkspaceId) 
        ? resolvedWorkspaceId! 
        : (isValidUUID(meta.workspace_id) 
            ? meta.workspace_id 
            : (isSupabaseConfigured() ? '' : `ws_${sbUser.id.substring(0, 8)}`));

      return {
        id: sbUser.id,
        email: sbUser.email || '',
        name: profileData?.full_name || fullName,
        companyName: resolvedWorkspaceName || profileData?.company_name || activeCompanyName,
        workspaceId: finalWsId,
        role: (resolvedRole as 'ADMIN' | 'MEMBER' | 'VIEWER') || 'ADMIN',
      };
    } catch {
      return mapSupabaseUser(sbUser);
    }
  },

  async signUp(params: SignUpParams): Promise<{ user: User | null; session: any; requiresEmailConfirmation?: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        session: null,
        error: 'Supabase authentication is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: params.fullName.trim(),
            company_name: params.companyName.trim(),
          },
        },
      });

      if (error) {
        // Handle existing email or user already registered error safely
        if (
          error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('user already exists')
        ) {
          return {
            user: null,
            session: null,
            error: 'An account with this email address already exists. Please sign in instead.',
          };
        }
        return { user: null, session: null, error: error.message };
      }

      // Check if user already exists when email confirmation is enabled (Supabase returns user with empty identities)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          user: null,
          session: null,
          error: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      if (!data.user) {
        return {
          user: null,
          session: null,
          error: 'Unable to create your account right now. Please try again.',
        };
      }

      // If Supabase returned an active session immediately (e.g. Email confirmation disabled)
      if (data.session?.user) {
        const appUser = await this.ensureUserWorkspaceAndProfile(data.session.user);
        return { user: appUser, session: data.session, requiresEmailConfirmation: false };
      }

      // Email confirmation is required (session is null)
      const mappedUser = mapSupabaseUser(data.user);
      return {
        user: mappedUser,
        session: null,
        requiresEmailConfirmation: true,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        error: 'Unable to create your account right now. Please try again.',
      };
    }
  },

  async signIn(params: SignInParams): Promise<{ user: User | null; session: any; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        session: null,
        error: 'Supabase authentication is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim(),
        password: params.password,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          return {
            user: null,
            session: null,
            error: 'Your email has not been verified yet. Please check your inbox for the confirmation link.',
          };
        }
        return { user: null, session: null, error: 'Email or password is incorrect.' };
      }

      if (data.session?.user) {
        const appUser = await this.ensureUserWorkspaceAndProfile(data.session.user);
        return { user: appUser, session: data.session };
      }

      return { user: null, session: null, error: 'Email or password is incorrect.' };
    } catch {
      return { user: null, session: null, error: 'Email or password is incorrect.' };
    }
  },

  async signOut(): Promise<{ error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err?.message || 'Error signing out' };
      }
    }

    return {};
  },

  async getSession(): Promise<{ user: User | null; session: any }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
          return { user: null, session: null };
        }
        const appUser = await this.ensureUserWorkspaceAndProfile(data.session.user);
        return {
          user: appUser,
          session: data.session,
        };
      } catch {
        return { user: null, session: null };
      }
    }

    return { user: null, session: null };
  },

  async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          return null;
        }
        return await this.ensureUserWorkspaceAndProfile(data.user);
      } catch {
        return null;
      }
    }
    return null;
  },

  async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured.',
      };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to send password reset.' };
    }
  },

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        if (error.message?.toLowerCase().includes('least 6') || error.message?.toLowerCase().includes('short')) {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to update password.' };
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void): { unsubscribe: () => void } {
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
      return {
        unsubscribe: () => subscription.unsubscribe(),
      };
    }

    return {
      unsubscribe: () => {},
    };
  },
};
