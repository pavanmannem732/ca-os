-- Performance Hardening Migration
-- Resolving Auth RLS InitPlan warnings and Unindexed Foreign Keys

-- 1. Optimize RLS Policies (LINT 0003)
-- Wrapping function calls in (SELECT ...) allows for "InitPlan" optimization

-- We'll recreate the policies with the optimized pattern
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('clients', 'compliance_tasks', 'ai_drafts', 'invoices', 'notifications', 'whatsapp_conversations', 'whatsapp_messages', 'documents', 'folders', 'billing_logs', 'audit_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Firm isolation policy" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Firm isolation for %I" ON public.%I', t, t);
    -- The (SELECT get_user_firm_id()) pattern is key for performance
    EXECUTE format('CREATE POLICY "Firm isolation policy" ON public.%I FOR ALL TO authenticated USING (firm_id = (SELECT get_user_firm_id()))', t);
  END LOOP;
END $$;

-- Specifically for the users and firms tables
DROP POLICY IF EXISTS "Users can see colleagues in same firm" ON public.users;
CREATE POLICY "Users can see colleagues in same firm" ON public.users
FOR SELECT TO authenticated
USING (firm_id = (SELECT get_user_firm_id()));

DROP POLICY IF EXISTS "Users can see their own firm details" ON public.firms;
CREATE POLICY "Users can see their own firm details" ON public.firms
FOR SELECT TO authenticated
USING (id = (SELECT get_user_firm_id()));

-- 2. Add Missing Foreign Key Indexes (LINT 0001)
-- ai_drafts
CREATE INDEX IF NOT EXISTS idx_ai_drafts_client_id ON public.ai_drafts (client_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_created_by ON public.ai_drafts (created_by);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_id ON public.audit_logs (firm_id);

-- billing_logs
CREATE INDEX IF NOT EXISTS idx_billing_logs_approved_by ON public.billing_logs (approved_by);
CREATE INDEX IF NOT EXISTS idx_billing_logs_client_id ON public.billing_logs (client_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_firm_id ON public.billing_logs (firm_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_invoice_id ON public.billing_logs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_staff_user_id ON public.billing_logs (staff_user_id);
CREATE INDEX IF NOT EXISTS idx_billing_logs_task_id ON public.billing_logs (task_id);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_assigned_staff ON public.clients (assigned_primary_staff_id);

-- compliance_tasks
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_assigned_by ON public.compliance_tasks (assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_assigned_to ON public.compliance_tasks (assigned_to_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON public.documents (task_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents (uploaded_by_user_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_client ON public.notifications (recipient_client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON public.notifications (recipient_user_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_client_id ON public.whatsapp_messages (client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_document_id ON public.whatsapp_messages (document_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_user ON public.whatsapp_messages (sender_user_id);
