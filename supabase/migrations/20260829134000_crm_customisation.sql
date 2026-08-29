-- Relaticle-inspired CRM customisation without duplicating PalladiumAI CRM records.
-- Existing crm_contacts remain the source of truth; custom values are stored on each contact.

alter table public.crm_contacts
  add column if not exists custom_values jsonb not null default '{}'::jsonb;

create table if not exists public.crm_field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,62}$'),
  label text not null check (char_length(label) between 1 and 120),
  field_type text not null check (field_type in ('text','number','date','boolean','select','multi_select','url','email','phone')),
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);

create table if not exists public.crm_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  sort_config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contacts_custom_values_gin on public.crm_contacts using gin(custom_values);
create index if not exists crm_field_definitions_user_idx on public.crm_field_definitions(user_id, is_active, sort_order);
create index if not exists crm_saved_views_user_idx on public.crm_saved_views(user_id, created_at desc);

create trigger crm_field_definitions_updated_at before update on public.crm_field_definitions
for each row execute function public.set_updated_at();
create trigger crm_saved_views_updated_at before update on public.crm_saved_views
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.crm_field_definitions, public.crm_saved_views to authenticated;
grant all on public.crm_field_definitions, public.crm_saved_views to service_role;
alter table public.crm_field_definitions enable row level security;
alter table public.crm_saved_views enable row level security;

create policy "crm_field_definitions_owner" on public.crm_field_definitions
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "crm_saved_views_owner" on public.crm_saved_views
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
