-- Spend limits: authoritative, server-enforced ceilings for agent spending.
CREATE TABLE public.spend_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id uuid REFERENCES public.personal_agents(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'user',
  currency text NOT NULL DEFAULT 'GBP',
  per_transaction_limit numeric,
  monthly_cap numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX spend_limits_user_scope_idx
  ON public.spend_limits (user_id, coalesce(agent_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spend_limits TO authenticated;
GRANT ALL ON public.spend_limits TO service_role;
ALTER TABLE public.spend_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spend_limits_own" ON public.spend_limits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER spend_limits_updated_at BEFORE UPDATE ON public.spend_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tracked products: price and availability watches.
CREATE TABLE public.product_watches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id uuid REFERENCES public.personal_agents(id) ON DELETE SET NULL,
  shopping_result_id uuid REFERENCES public.shopping_results(id) ON DELETE SET NULL,
  product text NOT NULL,
  seller text,
  url text,
  currency text NOT NULL DEFAULT 'GBP',
  target_price numeric,
  last_price numeric,
  best_price numeric,
  in_stock boolean,
  status text NOT NULL DEFAULT 'active',
  last_checked_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX product_watches_user_idx ON public.product_watches (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_watches TO authenticated;
GRANT ALL ON public.product_watches TO service_role;
ALTER TABLE public.product_watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_watches_own" ON public.product_watches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER product_watches_updated_at BEFORE UPDATE ON public.product_watches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Shopping lists.
CREATE TABLE public.shopping_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id uuid REFERENCES public.personal_agents(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'GBP',
  budget numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX shopping_lists_user_idx ON public.shopping_lists (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_lists_own" ON public.shopping_lists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shopping_lists_updated_at BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shopping_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  shopping_task_id uuid REFERENCES public.shopping_tasks(id) ON DELETE SET NULL,
  shopping_result_id uuid REFERENCES public.shopping_results(id) ON DELETE SET NULL,
  name text NOT NULL,
  notes text,
  quantity integer NOT NULL DEFAULT 1,
  budget numeric,
  status text NOT NULL DEFAULT 'pending',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX shopping_list_items_list_idx ON public.shopping_list_items (list_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_list_items_own" ON public.shopping_list_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shopping_list_items_updated_at BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Quantity on prepared purchases so the pre-checkout summary is complete.
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;