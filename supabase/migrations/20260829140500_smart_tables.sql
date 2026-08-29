-- APITable-inspired structured data workspace, implemented natively on PalladiumAI/Supabase.
-- Automations deliberately reuse the existing workflows runtime rather than introducing a parallel engine.

create table if not exists public.smart_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  description text null,
  fields jsonb not null default '[]'::jsonb,
  default_view text not null default 'grid' check (default_view in ('grid','kanban','form')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_table_records (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.smart_tables(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_table_views (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.smart_tables(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'grid' check (kind in ('grid','kanban','form')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smart_tables_user_updated_idx on public.smart_tables(user_id, updated_at desc);
create index if not exists smart_table_records_table_updated_idx on public.smart_table_records(table_id, updated_at desc);
create index if not exists smart_table_views_table_idx on public.smart_table_views(table_id, created_at asc);

alter table public.smart_tables enable row level security;
alter table public.smart_table_records enable row level security;
alter table public.smart_table_views enable row level security;

drop policy if exists smart_tables_owner_all on public.smart_tables;
create policy smart_tables_owner_all on public.smart_tables
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists smart_table_records_owner_all on public.smart_table_records;
create policy smart_table_records_owner_all on public.smart_table_records
  for all using (
    user_id = auth.uid() and exists (
      select 1 from public.smart_tables t where t.id = table_id and t.user_id = auth.uid()
    )
  ) with check (
    user_id = auth.uid() and exists (
      select 1 from public.smart_tables t where t.id = table_id and t.user_id = auth.uid()
    )
  );

drop policy if exists smart_table_views_owner_all on public.smart_table_views;
create policy smart_table_views_owner_all on public.smart_table_views
  for all using (
    user_id = auth.uid() and exists (
      select 1 from public.smart_tables t where t.id = table_id and t.user_id = auth.uid()
    )
  ) with check (
    user_id = auth.uid() and exists (
      select 1 from public.smart_tables t where t.id = table_id and t.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.smart_tables to authenticated;
grant select, insert, update, delete on public.smart_table_records to authenticated;
grant select, insert, update, delete on public.smart_table_views to authenticated;
