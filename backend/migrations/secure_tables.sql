-- 1. Enable RLS on all identified tables
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

-- 2. Define a helper function to get current user's firm_id
CREATE OR REPLACE FUNCTION get_user_firm_id() 
RETURNS uuid AS $$
  SELECT firm_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Create Firm Isolation Policies
-- This ensures users only see data belonging to their firm_id.

-- For users table
CREATE POLICY "Users can see colleagues in same firm" ON public.users
FOR SELECT TO authenticated
USING (firm_id = (SELECT firm_id FROM public.users WHERE id = auth.uid()));

-- Policy for all other tables containing firm_id
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns 
           WHERE column_name = 'firm_id' 
           AND table_schema = 'public'
           AND table_name IN ('clients', 'compliance_tasks', 'ai_drafts', 'invoices', 'notifications', 'whatsapp_conversations', 'whatsapp_messages', 'documents', 'folders', 'billing_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Firm isolation policy" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Firm isolation policy" ON public.%I FOR ALL TO authenticated USING (firm_id = (SELECT firm_id FROM public.users WHERE id = auth.uid()))', t);
  END LOOP;
END $$;

-- Policy for the firms table itself
CREATE POLICY "Users can see their own firm details" ON public.firms
FOR SELECT TO authenticated
USING (id = (SELECT firm_id FROM public.users WHERE id = auth.uid()));
