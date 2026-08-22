DROP POLICY IF EXISTS crm_contacts_insert ON public.crm_contacts;
CREATE POLICY crm_contacts_insert ON public.crm_contacts FOR INSERT TO authenticated
WITH CHECK ((user_id = auth.uid()) AND ((org_id IS NULL) OR public.is_org_member(org_id)));

DROP POLICY IF EXISTS finance_transactions_insert ON public.finance_transactions;
CREATE POLICY finance_transactions_insert ON public.finance_transactions FOR INSERT TO authenticated
WITH CHECK ((user_id = auth.uid()) AND ((org_id IS NULL) OR public.is_org_member(org_id)));

DROP POLICY IF EXISTS marketing_campaigns_insert ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_insert ON public.marketing_campaigns FOR INSERT TO authenticated
WITH CHECK ((user_id = auth.uid()) AND ((org_id IS NULL) OR public.is_org_member(org_id)));

DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK ((user_id = auth.uid()) AND ((org_id IS NULL) OR public.is_org_member(org_id)));