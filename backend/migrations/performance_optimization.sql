-- Performance Optimization Migration
-- Based on Index Advisor suggestions and pg_stat_statements analysis

-- 1. Optimize Users table queries
-- The advisor suggested indexing deleted_at because of the frequent "deleted_at IS NULL" checks
CREATE INDEX IF NOT EXISTS idx_users_deleted_at_null ON public.users (deleted_at) WHERE deleted_at IS NULL;

-- Indexing mobile for faster login/lookup
CREATE INDEX IF NOT EXISTS idx_users_mobile ON public.users (mobile);

-- 2. Optimize Folders table queries
-- The advisor suggested indexing parent_id for "parent_id IS NULL" (root folders)
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders (parent_id);

-- Speed up firm-specific folder lookups
CREATE INDEX IF NOT EXISTS idx_folders_firm_id ON public.folders (firm_id);

-- 3. Optimize AI Drafts (frequently queried by firm_id)
CREATE INDEX IF NOT EXISTS idx_ai_drafts_firm_id_created_at ON public.ai_drafts (firm_id, created_at DESC);

-- 4. Optimize Invoices (frequently ordered by date)
CREATE INDEX IF NOT EXISTS idx_invoices_firm_id_date ON public.invoices (firm_id, invoice_date DESC);
