const fs = require('fs');

let schema = fs.readFileSync('supabase/schema.sql', 'utf8');

const triggers = `
-- ==============================================================================
-- SAAS USAGE ENFORCEMENT TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION enforce_contractor_limit() RETURNS TRIGGER AS $$
DECLARE
    workspace_plan TEXT;
    contractor_count INT;
    contractor_limit INT;
BEGIN
    SELECT plan INTO workspace_plan FROM public.subscriptions WHERE workspace_id = NEW.workspace_id;
    IF workspace_plan IS NULL THEN
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
    document_count INT;
    document_limit INT;
BEGIN
    SELECT plan INTO workspace_plan FROM public.subscriptions WHERE workspace_id = NEW.workspace_id;
    IF workspace_plan IS NULL THEN
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
`;

if (!schema.includes('enforce_contractor_limit')) {
    schema = schema + "\n" + triggers;
    fs.writeFileSync('supabase/schema.sql', schema);
    console.log("Added triggers to schema");
}
