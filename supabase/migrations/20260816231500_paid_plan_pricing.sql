-- PalladiumAI commercial pricing hardening.
-- Explorer remains in the table for historical subscription/audit compatibility,
-- but is no longer offered to new customers.

UPDATE public.plans
SET
  is_active = false,
  updated_at = now()
WHERE code = 'explorer';

UPDATE public.plans
SET
  price_pence = 15000,
  stripe_price_id = 'builder_monthly_150_gbp',
  stripe_price_id_yearly = 'builder_yearly_1530_gbp',
  updated_at = now()
WHERE code = 'builder';

UPDATE public.plans
SET
  price_pence = 150000,
  stripe_price_id = 'business_monthly_1500_gbp',
  stripe_price_id_yearly = 'business_yearly_15300_gbp',
  updated_at = now()
WHERE code = 'business';

UPDATE public.plans
SET
  price_pence = 350000,
  stripe_price_id = 'enterprise_monthly_3500_gbp',
  stripe_price_id_yearly = 'enterprise_yearly_35700_gbp',
  updated_at = now()
WHERE code = 'enterprise';
