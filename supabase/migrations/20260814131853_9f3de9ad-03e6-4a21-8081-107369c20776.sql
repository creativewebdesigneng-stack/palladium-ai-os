-- CRM contacts / deals
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  title text,
  stage text NOT NULL DEFAULT 'lead',
  value_gbp numeric NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  source text,
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT TO authenticated USING (public.can_access(org_id, user_id));
CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.can_access(org_id, user_id)) WITH CHECK (public.can_access(org_id, user_id));
CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX crm_contacts_user_idx ON public.crm_contacts(user_id, created_at DESC);

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX crm_activities_contact_idx ON public.crm_activities(contact_id, occurred_at DESC);

-- Support
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text,
  requester_name text,
  requester_email text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  channel text NOT NULL DEFAULT 'web',
  assignee text,
  satisfaction integer,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT TO authenticated USING (public.can_access(org_id, user_id));
CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE TO authenticated USING (public.can_access(org_id, user_id)) WITH CHECK (public.can_access(org_id, user_id));
CREATE POLICY "support_tickets_delete" ON public.support_tickets FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id, created_at DESC);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_role text NOT NULL DEFAULT 'agent',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_messages_select" ON public.support_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "support_messages_insert" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "support_messages_delete" ON public.support_messages FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);

-- Finance
CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  occurred_on date NOT NULL DEFAULT current_date,
  direction text NOT NULL DEFAULT 'expense',
  category text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'settled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_transactions_select" ON public.finance_transactions FOR SELECT TO authenticated USING (public.can_access(org_id, user_id));
CREATE POLICY "finance_transactions_insert" ON public.finance_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "finance_transactions_update" ON public.finance_transactions FOR UPDATE TO authenticated USING (public.can_access(org_id, user_id)) WITH CHECK (public.can_access(org_id, user_id));
CREATE POLICY "finance_transactions_delete" ON public.finance_transactions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER finance_transactions_updated_at BEFORE UPDATE ON public.finance_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX finance_transactions_user_idx ON public.finance_transactions(user_id, occurred_on DESC);

-- Marketing
CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'draft',
  budget numeric NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_campaigns_select" ON public.marketing_campaigns FOR SELECT TO authenticated USING (public.can_access(org_id, user_id));
CREATE POLICY "marketing_campaigns_insert" ON public.marketing_campaigns FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "marketing_campaigns_update" ON public.marketing_campaigns FOR UPDATE TO authenticated USING (public.can_access(org_id, user_id)) WITH CHECK (public.can_access(org_id, user_id));
CREATE POLICY "marketing_campaigns_delete" ON public.marketing_campaigns FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX marketing_campaigns_user_idx ON public.marketing_campaigns(user_id, created_at DESC);