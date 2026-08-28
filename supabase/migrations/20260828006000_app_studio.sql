-- PalladiumAI native low-code App Studio.
-- Inspired by Appsmith's application/page/widget/query model (Apache-2.0),
-- implemented on PalladiumAI's existing auth, integrations, audit and deployment stack.

create table if not exists public.app_studio_apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  application_type text not null default 'web' check (application_type in ('web','internal','dashboard','mobile_web')),
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_release_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.app_studio_pages (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.app_studio_apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_home boolean not null default false,
  layout jsonb not null default '{"type":"canvas","version":1}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, slug)
);

create unique index if not exists app_studio_one_home_page
  on public.app_studio_pages(app_id) where is_home;

create table if not exists public.app_studio_widgets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.app_studio_pages(id) on delete cascade,
  app_id uuid not null references public.app_studio_apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid null references public.app_studio_widgets(id) on delete cascade,
  widget_type text not null check (widget_type in (
    'container','text','button','input','textarea','select','checkbox','table',
    'list','image','form','chart','stat','tabs','modal','divider','link'
  )),
  name text not null check (char_length(name) between 1 and 120),
  position jsonb not null default '{"x":0,"y":0,"w":4,"h":2}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  bindings jsonb not null default '{}'::jsonb,
  events jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_studio_widgets_page_idx on public.app_studio_widgets(page_id);

create table if not exists public.app_studio_datasources (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.app_studio_apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  provider text not null check (provider in ('rest','graphql','supabase','postgres','mysql','mongodb','mcp','integration')),
  connection_ref text null,
  config jsonb not null default '{}'::jsonb,
  environment text not null default 'development' check (environment in ('development','staging','production')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_id, name, environment)
);

create table if not exists public.app_studio_queries (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.app_studio_apps(id) on delete cascade,
  page_id uuid null references public.app_studio_pages(id) on delete cascade,
  datasource_id uuid not null references public.app_studio_datasources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  operation text not null,
  configuration jsonb not null default '{}'::jsonb,
  run_on_load boolean not null default false,
  requires_approval boolean not null default false,
  timeout_ms integer not null default 15000 check (timeout_ms between 1000 and 60000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(app_id, name)
);

create table if not exists public.app_studio_releases (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.app_studio_apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  notes text not null default '',
  status text not null default 'created' check (status in ('created','published','failed','rolled_back')),
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  unique(app_id, version)
);

alter table public.app_studio_apps
  drop constraint if exists app_studio_apps_published_release_id_fkey;
alter table public.app_studio_apps
  add constraint app_studio_apps_published_release_id_fkey
  foreign key (published_release_id) references public.app_studio_releases(id) on delete set null;

alter table public.app_studio_apps enable row level security;
alter table public.app_studio_pages enable row level security;
alter table public.app_studio_widgets enable row level security;
alter table public.app_studio_datasources enable row level security;
alter table public.app_studio_queries enable row level security;
alter table public.app_studio_releases enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'app_studio_apps','app_studio_pages','app_studio_widgets',
    'app_studio_datasources','app_studio_queries','app_studio_releases'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner_all', t
    );
  end loop;
end $$;

create or replace function public.touch_app_studio_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['app_studio_apps','app_studio_pages','app_studio_widgets','app_studio_datasources','app_studio_queries'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_app_studio_updated_at()',
      t || '_touch_updated_at', t
    );
  end loop;
end $$;


insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  ('app_studio', 'App Studio', 'development',
   'Create and edit persisted low-code applications, pages and components. Publishing remains an operator-controlled Studio action.',
   'builtin', false, 'medium', 'builder', true,
   '{"actions":["list_apps","create_app","add_page","add_widget"],"publishes":false,"credentials_server_side":true}'::jsonb)
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, description = excluded.description,
  kind = excluded.kind, requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level, min_plan = excluded.min_plan,
  is_active = excluded.is_active, config_schema = excluded.config_schema, updated_at = now();


create or replace function public.get_published_app_studio_release(p_app_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'app', r.snapshot->'app',
    'pages', coalesce(r.snapshot->'pages', '[]'::jsonb),
    'widgets', coalesce(r.snapshot->'widgets', '[]'::jsonb),
    'version', r.version,
    'publishedAt', r.published_at
  )
  from public.app_studio_apps a
  join public.app_studio_releases r on r.id = a.published_release_id
  where a.id = p_app_id
    and a.status = 'published'
    and r.status = 'published'
  limit 1
$$;

revoke all on function public.get_published_app_studio_release(uuid) from public;
grant execute on function public.get_published_app_studio_release(uuid) to anon, authenticated;
