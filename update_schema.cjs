const fs = require('fs');

let schema = fs.readFileSync('supabase/schema.sql', 'utf8');

const plansSql = `
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
`;

if (!schema.includes('public.plans')) {
  schema = schema.replace('-- 1. WORKSPACES', plansSql + '\n-- 1. WORKSPACES');
}

schema = schema.replace('CREATE TABLE IF NOT EXISTS public.subscriptions (', `CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'FREE',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- DROP OLD SUBSCRIPTIONS DEF
/*`);

schema = schema.replace('CREATE TABLE IF NOT EXISTS public.reminders', `*/
CREATE TABLE IF NOT EXISTS public.reminders`);


if (!schema.includes('ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;')) {
  schema = schema.replace('-- Enable RLS on all tables', `-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;`);

  schema += `
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Anyone can view plan_entitlements" ON public.plan_entitlements FOR SELECT USING (true);
`;
}

// Ensure handle_new_user assigns a FREE subscription
const newTriggerLogic = `
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, new.id, 'ADMIN')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Assign free subscription
    INSERT INTO public.subscriptions (workspace_id, plan, status, updated_at)
    VALUES (new_workspace_id, 'FREE', 'active', timezone('utc'::text, now()))
    ON CONFLICT (workspace_id) DO NOTHING;
`;
schema = schema.replace(/INSERT INTO public.workspace_members \(workspace_id, user_id, role\)\s+VALUES \(new_workspace_id, new.id, 'ADMIN'\)\s+ON CONFLICT \(workspace_id, user_id\) DO NOTHING;/, newTriggerLogic);

fs.writeFileSync('supabase/schema.sql', schema);
