-- Security Hardening Migration
-- Resolving Supabase Linter warnings

-- 1. Fix Function Search Path & Permissions (LINT 0011, 0028, 0029)
-- Setting a fixed search_path prevents "Search Path Hijacking"
ALTER FUNCTION public.get_user_firm_id() SET search_path = public;

-- Revoke execute from public/anon to prevent it from being called via REST API
REVOKE EXECUTE ON FUNCTION public.get_user_firm_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_firm_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_firm_id() FROM authenticated;

-- 2. Add missing policy for audit_logs (LINT 0008)
-- This allows users to see logs belonging to their own firm
DROP POLICY IF EXISTS "Firm isolation for audit_logs" ON public.audit_logs;
CREATE POLICY "Firm isolation for audit_logs" ON public.audit_logs 
FOR SELECT TO authenticated 
USING (firm_id = (SELECT firm_id FROM public.users WHERE id = auth.uid()));

-- 3. Satisfy linter for alembic_version (LINT 0008)
-- Since this is a system-level migration table, we add a policy that allows nothing 
-- to users, but satisfies the "every table must have a policy" rule.
DROP POLICY IF EXISTS "Internal only" ON public.alembic_version;
CREATE POLICY "Internal only" ON public.alembic_version 
FOR ALL TO postgres 
USING (true);
