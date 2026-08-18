-- ==============================================================================
-- VERITY - CONTRACTOR COMPLIANCE DATABASE SCHEMA (SUPABASE POSTGRESQL + RLS)
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WORKSPACES (Tenant Root)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WORKSPACE MEMBERS (Multi-tenant memberships and roles)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')) DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- 4. CONTRACTORS
CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    primary_contact TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    contractor_type TEXT NOT NULL DEFAULT 'Subcontractor',
    trade TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('COMPLIANT', 'EXPIRING', 'NON_COMPLIANT', 'PENDING_REVIEW')) DEFAULT 'PENDING_REVIEW',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. COMPLIANCE REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    insurance_required BOOLEAN NOT NULL DEFAULT true,
    business_license_required BOOLEAN NOT NULL DEFAULT true,
    professional_license_required BOOLEAN NOT NULL DEFAULT false,
    safety_documentation_required BOOLEAN NOT NULL DEFAULT false,
    tax_documentation_required BOOLEAN NOT NULL DEFAULT true,
    workers_comp_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('VALID', 'EXPIRING', 'EXPIRED', 'PENDING_REVIEW', 'REJECTED')) DEFAULT 'PENDING_REVIEW',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 7. ACTIVITIES / AUDIT LOG
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'FREE',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: users can select, insert, and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Workspaces: members can view their workspaces, authenticated users can insert workspace
CREATE POLICY "Members can view workspace" ON public.workspaces
    FOR SELECT USING (
        owner_id = auth.uid() OR public.is_workspace_member(id)
    );

CREATE POLICY "Users can insert workspace" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspace" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());

-- Workspace members: members can view colleagues in same workspace and add memberships
CREATE POLICY "Members can view workspace members" ON public.workspace_members
    FOR SELECT USING (
        public.is_workspace_member(workspace_id)
    );

CREATE POLICY "Users can insert workspace members" ON public.workspace_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR public.is_workspace_member(workspace_id)
    );

-- Contractors: members can read and write contractors in their workspace
CREATE POLICY "Workspace members can view contractors" ON public.contractors
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert contractors" ON public.contractors
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update contractors" ON public.contractors
    FOR UPDATE USING (public.is_workspace_member(workspace_id));

-- Compliance Requirements: members can read and write compliance requirements in their workspace
CREATE POLICY "Workspace members can view compliance" ON public.compliance_requirements
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert compliance" ON public.compliance_requirements
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update compliance" ON public.compliance_requirements
    FOR UPDATE USING (public.is_workspace_member(workspace_id));

-- Documents: members can read and write documents in their workspace
CREATE POLICY "Workspace members can view documents" ON public.documents
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert documents" ON public.documents
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update documents" ON public.documents
    FOR UPDATE USING (public.is_workspace_member(workspace_id));

-- Activities: members can view workspace activities
CREATE POLICY "Workspace members can view activities" ON public.activities
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert activities" ON public.activities
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

-- Subscriptions: members can view subscriptions in their workspace
CREATE POLICY "Workspace members can view subscriptions" ON public.subscriptions
    FOR SELECT USING (public.is_workspace_member(workspace_id));

-- ==============================================================================
-- AUTOMATIC USER PROVISIONING TRIGGER (POSTGRESQL)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id UUID;
  company TEXT;
  full_name_val TEXT;
BEGIN
  company := COALESCE(new.raw_user_meta_data->>'company_name', 'My Organization');
  full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  -- 1. Insert Profile
  INSERT INTO public.profiles (id, email, full_name, company_name)
  VALUES (new.id, new.email, full_name_val, company)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      company_name = COALESCE(EXCLUDED.company_name, profiles.company_name);

  -- 2. Check or Create Workspace
  SELECT workspace_id INTO new_workspace_id
  FROM public.workspace_members
  WHERE user_id = new.id
  LIMIT 1;

  IF new_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, owner_id, plan)
    VALUES (company, new.id, 'FREE')
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, new.id, 'ADMIN')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
