-- ==============================================================================
-- VERITY - CONTRACTOR COMPLIANCE DATABASE SCHEMA (SUPABASE POSTGRESQL + RLS)
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ==============================================================================
-- SAAS PLANS & ENTITLEMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    price_per_month INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    limit_value INTEGER, -- NULL means unlimited
    UNIQUE(plan_id, feature)
);

-- Seed default plans
INSERT INTO public.plans (slug, name, description, price_per_month) VALUES
('FREE', 'Free', 'Basic compliance tracking for small teams.', 0),
('STARTER', 'Starter', 'Advanced features for growing teams.', 49),
('PRO', 'Pro', 'Full compliance suite for professionals.', 99)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_contractors', 5 FROM public.plans WHERE slug = 'FREE' ON CONFLICT DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_documents', 20 FROM public.plans WHERE slug = 'FREE' ON CONFLICT DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_ai_extractions', 10 FROM public.plans WHERE slug = 'FREE' ON CONFLICT DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_contractors', 25 FROM public.plans WHERE slug = 'STARTER' ON CONFLICT DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_documents', 100 FROM public.plans WHERE slug = 'STARTER' ON CONFLICT DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_ai_extractions', 50 FROM public.plans WHERE slug = 'STARTER' ON CONFLICT DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_contractors', 100 FROM public.plans WHERE slug = 'PRO' ON CONFLICT DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_documents', 500 FROM public.plans WHERE slug = 'PRO' ON CONFLICT DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, feature, limit_value)
SELECT id, 'max_ai_extractions', 250 FROM public.plans WHERE slug = 'PRO' ON CONFLICT DO NOTHING;

-- 1. WORKSPACES (Tenant Root)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE',
    stripe_customer_id TEXT UNIQUE,
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
    processing_status TEXT NOT NULL CHECK (processing_status IN ('UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'VERIFIED', 'FAILED')) DEFAULT 'UPLOADED',
    processing_error TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    extracted_data JSONB,
    review_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 7. DOCUMENT EXTRACTIONS (AI OCR Audit Records & Traceable Evidence)
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    document_type_detected TEXT,
    raw_extracted_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_data JSONB DEFAULT '{}'::jsonb,
    requirement_checks JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('EXTRACTED', 'REVIEW_REQUIRED', 'VERIFIED', 'FAILED')),
    model_used TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
    workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'FREE',
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    cashfree_subscription_id TEXT,
    cashfree_plan_id TEXT,
    cancel_at_period_end BOOLEAN DEFAULT false,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- DROP OLD SUBSCRIPTIONS DEF
/*
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'FREE',
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    cashfree_subscription_id TEXT,
    cashfree_plan_id TEXT,
    cancel_at_period_end BOOLEAN DEFAULT false,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- DROP OLD SUBSCRIPTIONS DEF
/*
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'FREE',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. REMINDERS (Automated Expiration Checkpoints & Notices)
*/
*/
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    checkpoint TEXT NOT NULL CHECK (checkpoint IN ('30_DAYS', '15_DAYS', '7_DAYS', '1_DAY', 'EXPIRATION_DAY', 'MANUAL_REQUEST', 'COMPLIANCE_ACTION', 'GATE_READY')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'DISPATCHED')) DEFAULT 'SCHEDULED',
    recipient_email TEXT,
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(document_id, checkpoint)
);

-- 10. NOTIFICATIONS (Persistent Expiration Radar & Workspace Compliance Alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    checkpoint TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('CRITICAL', 'WARNING', 'INFO', 'LOW')) DEFAULT 'INFO',
    document_name TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER,
    action_url TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    email_status TEXT NOT NULL CHECK (email_status IN ('SENT', 'PENDING', 'NOT_CONFIGURED', 'FAILED', 'NONE')) DEFAULT 'NOT_CONFIGURED',
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, document_id, checkpoint, expiration_date)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership and ownership
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL OR ws_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage helper function to safely extract workspace UUID from storage path
CREATE OR REPLACE FUNCTION public.get_storage_workspace_id(path_str TEXT)
RETURNS UUID AS $$
DECLARE
  uuid_str TEXT;
BEGIN
  IF path_str IS NULL THEN
    RETURN NULL;
  END IF;
  uuid_str := substring(path_str from '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  IF uuid_str IS NOT NULL THEN
    RETURN uuid_str::uuid;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
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

CREATE POLICY "Workspace members can delete contractors" ON public.contractors
    FOR DELETE USING (public.is_workspace_member(workspace_id));

-- Compliance Requirements: members can read and write compliance requirements in their workspace
CREATE POLICY "Workspace members can view compliance" ON public.compliance_requirements
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert compliance" ON public.compliance_requirements
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update compliance" ON public.compliance_requirements
    FOR UPDATE USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete compliance" ON public.compliance_requirements
    FOR DELETE USING (public.is_workspace_member(workspace_id));

-- Documents: members can read and write documents in their workspace
CREATE POLICY "Workspace members can view documents" ON public.documents
    FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert documents" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_workspace_member(workspace_id)
        AND EXISTS (
            SELECT 1 FROM public.contractors c
            WHERE c.id = contractor_id
            AND c.workspace_id = documents.workspace_id
        )
    );

CREATE POLICY "Workspace members can update documents" ON public.documents
    FOR UPDATE TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (
        public.is_workspace_member(workspace_id)
        AND (
            contractor_id IS NULL OR EXISTS (
                SELECT 1 FROM public.contractors c
                WHERE c.id = contractor_id
                AND c.workspace_id = documents.workspace_id
            )
        )
    );

CREATE POLICY "Workspace members can delete documents" ON public.documents
    FOR DELETE TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- Document Extractions: members can view and insert extractions in their workspace
CREATE POLICY "Workspace members can view document_extractions" ON public.document_extractions
    FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert document_extractions" ON public.document_extractions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_workspace_member(workspace_id)
        AND EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_id
            AND d.workspace_id = document_extractions.workspace_id
        )
    );

CREATE POLICY "Workspace members can update document_extractions" ON public.document_extractions
    FOR UPDATE TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete document_extractions" ON public.document_extractions
    FOR DELETE TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- Activities: members can view workspace activities
CREATE POLICY "Workspace members can view activities" ON public.activities
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert activities" ON public.activities
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

-- Subscriptions: members can view subscriptions in their workspace
CREATE POLICY "Workspace members can view subscriptions" ON public.subscriptions
    FOR SELECT USING (public.is_workspace_member(workspace_id));

-- Reminders: members can view, create, update, and delete reminders in their workspace
CREATE POLICY "Workspace members can view reminders" ON public.reminders
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert reminders" ON public.reminders
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update reminders" ON public.reminders
    FOR UPDATE USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete reminders" ON public.reminders
    FOR DELETE USING (public.is_workspace_member(workspace_id));

-- Notifications: members can view, create, update, and delete notifications in their workspace
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view notifications" ON public.notifications
    FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update notifications" ON public.notifications
    FOR UPDATE USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete notifications" ON public.notifications
    FOR DELETE USING (public.is_workspace_member(workspace_id));

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
    
    -- Assign free subscription
    INSERT INTO public.subscriptions (workspace_id, plan, status, updated_at)
    VALUES (new_workspace_id, 'FREE', 'active', timezone('utc'::text, now()))
    ON CONFLICT (workspace_id) DO NOTHING;

    
    -- Assign free subscription
    INSERT INTO public.subscriptions (workspace_id, plan, status, updated_at)
    VALUES (new_workspace_id, 'FREE', 'active', timezone('utc'::text, now()))
    ON CONFLICT (workspace_id) DO NOTHING;

  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. SUPABASE STORAGE BUCKET & MULTI-TENANT STORAGE RLS POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Workspace members can read storage objects belonging to their workspace:
-- Path convention: workspace/{workspaceId}/contractors/{contractorId}/...
CREATE POLICY "Workspace members can view stored documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_workspace_member(public.get_storage_workspace_id(name))
);

CREATE POLICY "Workspace members can upload stored documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_workspace_member(public.get_storage_workspace_id(name))
);

CREATE POLICY "Workspace members can update stored documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_workspace_member(public.get_storage_workspace_id(name))
);

CREATE POLICY "Workspace members can delete stored documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_workspace_member(public.get_storage_workspace_id(name))
);


CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Anyone can view plan_entitlements" ON public.plan_entitlements FOR SELECT USING (true);


-- ==============================================================================
-- SAAS USAGE ENFORCEMENT TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION enforce_contractor_limit() RETURNS TRIGGER AS $$
DECLARE
    workspace_plan TEXT;
    sub_status TEXT;
    contractor_count INT;
    contractor_limit INT;
BEGIN
    SELECT plan, status INTO workspace_plan, sub_status FROM public.subscriptions WHERE workspace_id = NEW.workspace_id;
    IF workspace_plan IS NULL THEN
        workspace_plan := 'FREE';
    END IF;

    -- If subscription status is not active or trialing, override the plan to FREE
    IF sub_status IS NOT NULL AND sub_status <> 'active' AND sub_status <> 'trialing' THEN
        workspace_plan := 'FREE';
    END IF;

    SELECT limit_value INTO contractor_limit 
    FROM public.plan_entitlements pe
    JOIN public.plans p ON p.id = pe.plan_id
    WHERE p.slug = workspace_plan AND pe.feature = 'max_contractors';

    IF contractor_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO contractor_count FROM public.contractors WHERE workspace_id = NEW.workspace_id;
        IF contractor_count >= contractor_limit THEN
            RAISE EXCEPTION 'LIMIT_REACHED: Maximum contractor limit exceeded for current plan.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_contractor_limit_trigger ON public.contractors;
CREATE TRIGGER enforce_contractor_limit_trigger
BEFORE INSERT ON public.contractors
FOR EACH ROW EXECUTE FUNCTION enforce_contractor_limit();


CREATE OR REPLACE FUNCTION enforce_document_limit() RETURNS TRIGGER AS $$
DECLARE
    workspace_plan TEXT;
    sub_status TEXT;
    document_count INT;
    document_limit INT;
BEGIN
    SELECT plan, status INTO workspace_plan, sub_status FROM public.subscriptions WHERE workspace_id = NEW.workspace_id;
    IF workspace_plan IS NULL THEN
        workspace_plan := 'FREE';
    END IF;

    -- If subscription status is not active or trialing, override the plan to FREE
    IF sub_status IS NOT NULL AND sub_status <> 'active' AND sub_status <> 'trialing' THEN
        workspace_plan := 'FREE';
    END IF;

    SELECT limit_value INTO document_limit 
    FROM public.plan_entitlements pe
    JOIN public.plans p ON p.id = pe.plan_id
    WHERE p.slug = workspace_plan AND pe.feature = 'max_documents';

    IF document_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO document_count FROM public.documents WHERE workspace_id = NEW.workspace_id;
        IF document_count >= document_limit THEN
            RAISE EXCEPTION 'LIMIT_REACHED: Maximum document limit exceeded for current plan.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_document_limit_trigger ON public.documents;
CREATE TRIGGER enforce_document_limit_trigger
BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION enforce_document_limit();


CREATE OR REPLACE FUNCTION enforce_ai_extraction_limit() RETURNS TRIGGER AS $$
DECLARE
    workspace_plan TEXT;
    sub_status TEXT;
    extraction_count INT;
    extraction_limit INT;
BEGIN
    SELECT plan, status INTO workspace_plan, sub_status FROM public.subscriptions WHERE workspace_id = NEW.workspace_id;
    IF workspace_plan IS NULL THEN
        workspace_plan := 'FREE';
    END IF;

    -- If subscription status is not active or trialing, override the plan to FREE
    IF sub_status IS NOT NULL AND sub_status <> 'active' AND sub_status <> 'trialing' THEN
        workspace_plan := 'FREE';
    END IF;

    SELECT limit_value INTO extraction_limit 
    FROM public.plan_entitlements pe
    JOIN public.plans p ON p.id = pe.plan_id
    WHERE p.slug = workspace_plan AND pe.feature = 'max_ai_extractions';

    IF extraction_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO extraction_count FROM public.document_extractions WHERE workspace_id = NEW.workspace_id;
        IF extraction_count >= extraction_limit THEN
            RAISE EXCEPTION 'LIMIT_REACHED: Maximum AI extraction limit exceeded for current plan.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_ai_extraction_limit_trigger ON public.document_extractions;
CREATE TRIGGER enforce_ai_extraction_limit_trigger
BEFORE INSERT ON public.document_extractions
FOR EACH ROW EXECUTE FUNCTION enforce_ai_extraction_limit();

-- ==============================================================================
-- STRIPE WEBHOOK EVENTS (Idempotency)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
    event_id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- CASHFREE WEBHOOK EVENTS (Idempotency)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cashfree_events (
    event_id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- PRODUCTION PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contractors_workspace_id ON public.contractors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_contractor_id ON public.compliance_requirements(contractor_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_workspace_id ON public.compliance_requirements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_contractor_id ON public.documents(contractor_id);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON public.documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_workspace_id ON public.document_extractions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON public.activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reminders_workspace_id ON public.reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON public.reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON public.notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(workspace_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_cashfree_events_event_id ON public.cashfree_events(event_id);

