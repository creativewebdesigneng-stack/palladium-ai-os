-- Recover existing App Studio and private analytics contracts; no automatic publication, tool activation or analytics backfill.
do $$ begin if to_regclass('public.app_studio_apps') is not null or to_regclass('public.app_studio_pages') is not null or to_regclass('public.app_studio_widgets') is not null or to_regclass('public.app_studio_datasources') is not null or to_regclass('public.app_studio_queries') is not null or to_regclass('public.app_studio_releases') is not null or to_regclass('public.product_analytics_projects') is not null or to_regclass('public.product_analytics_events') is not null or to_regclass('public.product_analytics_funnels') is not null or to_regclass('public.product_analytics_experiments') is not null or to_regprocedure('public.get_published_app_studio_release(uuid)') is not null then raise exception 'Studio recovery requires all ten tables and the public release RPC absent; review partial state first.'; end if;end $$;

-- Contract: 20260828006000_app_studio.sql
create table public.app_studio_apps (
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

-- Contract: 20260828006000_app_studio.sql
create table public.app_studio_pages (
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

-- Contract: 20260828006000_app_studio.sql
create table public.app_studio_widgets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.app_studio_pages(id) on delete cascade,
  app_id uuid not null references public.app_studio_apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid null,
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

-- Contract: 20260828006000_app_studio.sql
create table public.app_studio_datasources (
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

-- Contract: 20260828006000_app_studio.sql
create table public.app_studio_queries (
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

-- Contract: 20260828006000_app_studio.sql
create table public.app_studio_releases (
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

-- Contract: 20260829145000_product_analytics_media_dashboard.sql
create table public.product_analytics_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  name text not null check (char_length(name) between 1 and 160),
  domain text,
  write_key uuid not null default gen_random_uuid() unique,
  currency text not null default 'USD' check (char_length(currency) = 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829145000_product_analytics_media_dashboard.sql
create table public.product_analytics_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.product_analytics_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visitor_id text,
  session_id text,
  event_name text not null check (char_length(event_name) between 1 and 160),
  path text,
  referrer text,
  properties jsonb not null default '{}'::jsonb,
  revenue_cents bigint not null default 0 check (revenue_cents >= 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Contract: 20260829145000_product_analytics_media_dashboard.sql
create table public.product_analytics_funnels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.product_analytics_projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829145000_product_analytics_media_dashboard.sql
create table public.product_analytics_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.product_analytics_projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  variants jsonb not null default '[]'::jsonb,
  goal_event text not null check (char_length(goal_event) between 1 and 160),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_studio_widgets add constraint studio_widget_parent_identity unique(id,app_id,page_id,user_id);
alter table public.app_studio_widgets add constraint studio_widget_parent_fk foreign key(parent_id,app_id,page_id,user_id) references public.app_studio_widgets(id,app_id,page_id,user_id) on delete cascade;
alter table public.app_studio_widgets add constraint studio_widget_not_self check (parent_id is distinct from id);
alter table public.app_studio_apps add constraint app_studio_apps_published_release_id_fkey foreign key(published_release_id) references public.app_studio_releases(id) on delete set null;
create unique index app_studio_one_home_page on public.app_studio_pages(app_id) where is_home;
create index app_studio_apps_recovery_0_idx on public.app_studio_apps(published_release_id);
create index app_studio_pages_recovery_0_idx on public.app_studio_pages(user_id);
create index app_studio_widgets_recovery_0_idx on public.app_studio_widgets(user_id);
create index app_studio_widgets_recovery_1_idx on public.app_studio_widgets(page_id);
create index app_studio_widgets_recovery_2_idx on public.app_studio_widgets(app_id);
create index app_studio_widgets_recovery_3_idx on public.app_studio_widgets(parent_id,app_id,page_id,user_id);
create index app_studio_datasources_recovery_0_idx on public.app_studio_datasources(user_id);
create index app_studio_queries_recovery_0_idx on public.app_studio_queries(user_id);
create index app_studio_queries_recovery_1_idx on public.app_studio_queries(page_id);
create index app_studio_queries_recovery_2_idx on public.app_studio_queries(datasource_id);
create index app_studio_releases_recovery_0_idx on public.app_studio_releases(user_id);
create index product_analytics_projects_recovery_0_idx on public.product_analytics_projects(user_id,created_at desc);
create index product_analytics_events_recovery_0_idx on public.product_analytics_events(project_id,occurred_at desc);
create index product_analytics_events_recovery_1_idx on public.product_analytics_events(user_id,occurred_at desc);
create index product_analytics_events_recovery_2_idx on public.product_analytics_events(project_id,event_name,occurred_at desc);
create index product_analytics_funnels_recovery_0_idx on public.product_analytics_funnels(user_id);
create index product_analytics_funnels_recovery_1_idx on public.product_analytics_funnels(project_id,created_at desc);
create index product_analytics_experiments_recovery_0_idx on public.product_analytics_experiments(user_id);
create index product_analytics_experiments_recovery_1_idx on public.product_analytics_experiments(project_id,created_at desc);
create index product_analytics_events_recovery_properties_idx on public.product_analytics_events using gin(properties);
create trigger app_studio_apps_recovery_updated before update on public.app_studio_apps for each row execute function public.set_updated_at();
create trigger app_studio_pages_recovery_updated before update on public.app_studio_pages for each row execute function public.set_updated_at();
create trigger app_studio_widgets_recovery_updated before update on public.app_studio_widgets for each row execute function public.set_updated_at();
create trigger app_studio_datasources_recovery_updated before update on public.app_studio_datasources for each row execute function public.set_updated_at();
create trigger app_studio_queries_recovery_updated before update on public.app_studio_queries for each row execute function public.set_updated_at();

alter table public.app_studio_apps enable row level security;
revoke all on public.app_studio_apps from anon,authenticated;
grant all on public.app_studio_apps to service_role;
grant select,insert,delete on public.app_studio_apps to authenticated;
grant update on public.app_studio_apps to authenticated;
create policy app_studio_apps_recovery_select on public.app_studio_apps for select to authenticated using (user_id=(select auth.uid()));
create policy app_studio_apps_recovery_insert on public.app_studio_apps for insert to authenticated with check (user_id=(select auth.uid()) and (published_release_id is null or exists(select 1 from public.app_studio_releases p where p.id=published_release_id and p.app_id=app_studio_apps.id and p.user_id=(select auth.uid()))) and (org_id is null or private.is_org_member(org_id)));
create policy app_studio_apps_recovery_update on public.app_studio_apps for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (published_release_id is null or exists(select 1 from public.app_studio_releases p where p.id=published_release_id and p.app_id=app_studio_apps.id and p.user_id=(select auth.uid()))) and (org_id is null or private.is_org_member(org_id)));
create policy app_studio_apps_recovery_delete on public.app_studio_apps for delete to authenticated using (user_id=(select auth.uid()));

alter table public.app_studio_pages enable row level security;
revoke all on public.app_studio_pages from anon,authenticated;
grant all on public.app_studio_pages to service_role;
grant select,insert,delete on public.app_studio_pages to authenticated;
grant update on public.app_studio_pages to authenticated;
create policy app_studio_pages_recovery_select on public.app_studio_pages for select to authenticated using (user_id=(select auth.uid()));
create policy app_studio_pages_recovery_insert on public.app_studio_pages for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())));
create policy app_studio_pages_recovery_update on public.app_studio_pages for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())));
create policy app_studio_pages_recovery_delete on public.app_studio_pages for delete to authenticated using (user_id=(select auth.uid()));

alter table public.app_studio_widgets enable row level security;
revoke all on public.app_studio_widgets from anon,authenticated;
grant all on public.app_studio_widgets to service_role;
grant select,insert,delete on public.app_studio_widgets to authenticated;
grant update on public.app_studio_widgets to authenticated;
create policy app_studio_widgets_recovery_select on public.app_studio_widgets for select to authenticated using (user_id=(select auth.uid()));
create policy app_studio_widgets_recovery_insert on public.app_studio_widgets for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())) and exists(select 1 from public.app_studio_pages p where p.id=page_id and p.app_id=app_studio_widgets.app_id and p.user_id=(select auth.uid())));
create policy app_studio_widgets_recovery_update on public.app_studio_widgets for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())) and exists(select 1 from public.app_studio_pages p where p.id=page_id and p.app_id=app_studio_widgets.app_id and p.user_id=(select auth.uid())));
create policy app_studio_widgets_recovery_delete on public.app_studio_widgets for delete to authenticated using (user_id=(select auth.uid()));

alter table public.app_studio_datasources enable row level security;
revoke all on public.app_studio_datasources from anon,authenticated;
grant all on public.app_studio_datasources to service_role;
grant select,insert,delete on public.app_studio_datasources to authenticated;
grant update on public.app_studio_datasources to authenticated;
create policy app_studio_datasources_recovery_select on public.app_studio_datasources for select to authenticated using (user_id=(select auth.uid()));
create policy app_studio_datasources_recovery_insert on public.app_studio_datasources for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())));
create policy app_studio_datasources_recovery_update on public.app_studio_datasources for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())));
create policy app_studio_datasources_recovery_delete on public.app_studio_datasources for delete to authenticated using (user_id=(select auth.uid()));

alter table public.app_studio_queries enable row level security;
revoke all on public.app_studio_queries from anon,authenticated;
grant all on public.app_studio_queries to service_role;
grant select,insert,delete on public.app_studio_queries to authenticated;
grant update on public.app_studio_queries to authenticated;
create policy app_studio_queries_recovery_select on public.app_studio_queries for select to authenticated using (user_id=(select auth.uid()));
create policy app_studio_queries_recovery_insert on public.app_studio_queries for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())) and exists(select 1 from public.app_studio_datasources p where p.id=datasource_id and p.app_id=app_studio_queries.app_id and p.user_id=(select auth.uid())) and (page_id is null or exists(select 1 from public.app_studio_pages p where p.id=page_id and p.app_id=app_studio_queries.app_id and p.user_id=(select auth.uid()))));
create policy app_studio_queries_recovery_update on public.app_studio_queries for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())) and exists(select 1 from public.app_studio_datasources p where p.id=datasource_id and p.app_id=app_studio_queries.app_id and p.user_id=(select auth.uid())) and (page_id is null or exists(select 1 from public.app_studio_pages p where p.id=page_id and p.app_id=app_studio_queries.app_id and p.user_id=(select auth.uid()))));
create policy app_studio_queries_recovery_delete on public.app_studio_queries for delete to authenticated using (user_id=(select auth.uid()));

alter table public.app_studio_releases enable row level security;
revoke all on public.app_studio_releases from anon,authenticated;
grant all on public.app_studio_releases to service_role;
grant select,insert,delete on public.app_studio_releases to authenticated;
grant update(status,published_at) on public.app_studio_releases to authenticated;
create policy app_studio_releases_recovery_select on public.app_studio_releases for select to authenticated using (user_id=(select auth.uid()));
create policy app_studio_releases_recovery_insert on public.app_studio_releases for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())));
create policy app_studio_releases_recovery_update on public.app_studio_releases for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.app_studio_apps p where p.id=app_id and p.user_id=(select auth.uid())));
create policy app_studio_releases_recovery_delete on public.app_studio_releases for delete to authenticated using (user_id=(select auth.uid()));

alter table public.product_analytics_projects enable row level security;
revoke all on public.product_analytics_projects from anon,authenticated;
grant all on public.product_analytics_projects to service_role;
grant select,insert,delete on public.product_analytics_projects to authenticated;
grant update on public.product_analytics_projects to authenticated;
create policy product_analytics_projects_recovery_select on public.product_analytics_projects for select to authenticated using (user_id=(select auth.uid()));
create policy product_analytics_projects_recovery_insert on public.product_analytics_projects for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy product_analytics_projects_recovery_update on public.product_analytics_projects for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy product_analytics_projects_recovery_delete on public.product_analytics_projects for delete to authenticated using (user_id=(select auth.uid()));

alter table public.product_analytics_events enable row level security;
revoke all on public.product_analytics_events from anon,authenticated;
grant all on public.product_analytics_events to service_role;
grant select,insert,delete on public.product_analytics_events to authenticated;
grant update on public.product_analytics_events to authenticated;
create policy product_analytics_events_recovery_select on public.product_analytics_events for select to authenticated using (user_id=(select auth.uid()));
create policy product_analytics_events_recovery_insert on public.product_analytics_events for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.product_analytics_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy product_analytics_events_recovery_update on public.product_analytics_events for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.product_analytics_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy product_analytics_events_recovery_delete on public.product_analytics_events for delete to authenticated using (user_id=(select auth.uid()));

alter table public.product_analytics_funnels enable row level security;
revoke all on public.product_analytics_funnels from anon,authenticated;
grant all on public.product_analytics_funnels to service_role;
grant select,insert,delete on public.product_analytics_funnels to authenticated;
grant update on public.product_analytics_funnels to authenticated;
create policy product_analytics_funnels_recovery_select on public.product_analytics_funnels for select to authenticated using (user_id=(select auth.uid()));
create policy product_analytics_funnels_recovery_insert on public.product_analytics_funnels for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.product_analytics_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy product_analytics_funnels_recovery_update on public.product_analytics_funnels for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.product_analytics_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy product_analytics_funnels_recovery_delete on public.product_analytics_funnels for delete to authenticated using (user_id=(select auth.uid()));

alter table public.product_analytics_experiments enable row level security;
revoke all on public.product_analytics_experiments from anon,authenticated;
grant all on public.product_analytics_experiments to service_role;
grant select,insert,delete on public.product_analytics_experiments to authenticated;
grant update on public.product_analytics_experiments to authenticated;
create policy product_analytics_experiments_recovery_select on public.product_analytics_experiments for select to authenticated using (user_id=(select auth.uid()));
create policy product_analytics_experiments_recovery_insert on public.product_analytics_experiments for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.product_analytics_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy product_analytics_experiments_recovery_update on public.product_analytics_experiments for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.product_analytics_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy product_analytics_experiments_recovery_delete on public.product_analytics_experiments for delete to authenticated using (user_id=(select auth.uid()));

-- Preserve the existing narrow public-reader architecture. No owner datasource or query authority crosses this boundary.
create function public.get_published_app_studio_release(p_app_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'app',(r.snapshot->'app')-'settings'-'user_id'-'org_id',
  'pages',coalesce((select jsonb_agg(p-'user_id'-'org_id') from jsonb_array_elements(r.snapshot->'pages') p),'[]'::jsonb),
  'widgets',coalesce((select jsonb_agg(w-'user_id'-'org_id') from jsonb_array_elements(r.snapshot->'widgets') w),'[]'::jsonb),
  'version',r.version,'publishedAt',r.published_at)
 from public.app_studio_apps a join public.app_studio_releases r on r.id=a.published_release_id and r.app_id=a.id and r.user_id=a.user_id
 where a.id=p_app_id and a.status='published' and r.status='published' limit 1
$$;
revoke all on function public.get_published_app_studio_release(uuid) from public;
grant execute on function public.get_published_app_studio_release(uuid) to anon,authenticated,service_role;
