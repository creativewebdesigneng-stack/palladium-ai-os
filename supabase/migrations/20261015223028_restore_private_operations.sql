-- Recover private operations history and drafts only; no provider calls, approvals or publication backfill.
do $$ begin if to_regclass('public.social_posts') is not null or to_regclass('public.social_post_targets') is not null or to_regclass('public.notification_endpoints') is not null or to_regclass('public.web_crawl_jobs') is not null or to_regclass('public.voice_clone_jobs') is not null or to_regclass('public.user_documents') is not null then raise exception 'Private operations recovery requires all six tables absent; review partial state first.'; end if;end $$;

-- Contract: 20260828183000_social_operations.sql
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid null,
  title text not null default '',
  content text not null,
  campaign text null,
  labels text[] not null default '{}',
  media jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','partial','failed','cancelled')),
  scheduled_for timestamptz null,
  published_at timestamptz null,
  created_by_agent_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828183000_social_operations.sql
create table public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  action text not null check (action ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  action_input jsonb not null default '{}'::jsonb,
  transport text null,
  status text not null default 'pending' check (status in ('pending','approval_required','approved','publishing','published','failed','cancelled')),
  approval_request_id uuid null,
  provider_post_id text null,
  published_url text null,
  last_error text null,
  metrics jsonb not null default '{}'::jsonb,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id, provider, action)
);

-- Contract: 20260829160500_web_deploy_notifications_fitness.sql
create table public.notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null default 'ntfy' check (provider in ('ntfy')),
  label text not null,
  topic text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, topic)
);

-- Contract: 20260829160500_web_deploy_notifications_fitness.sql
create table public.web_crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('firecrawl','crawlee')),
  operation text not null check (operation in ('search','scrape','crawl')),
  source text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  provider_job_id text,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260830012000_voice_clone_jobs.sql
create table public.voice_clone_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'luxtts' check (provider in ('luxtts')),
  text text not null,
  reference_filename text not null,
  reference_mime_type text not null,
  speed numeric not null default 1,
  steps integer not null default 4,
  status text not null default 'queued',
  duration_ms integer,
  output_bytes integer,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Contract: 20260820160743_b675fefa-0342-46bc-9f53-c4ae0f8530e9.sql
create table public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  doc_type text not null default 'document',
  format text not null default 'md',
  body text not null default '',
  source text not null default 'manual'
    check (source in ('manual','ai_generated','ai_summarise','ai_rewrite','ai_translate','ai_analyse')),
  origin_document_id uuid,
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_documents add constraint user_documents_owner_identity unique(id,user_id);
alter table public.user_documents add constraint user_documents_origin_owner_fk foreign key(origin_document_id,user_id) references public.user_documents(id,user_id) on delete set null(origin_document_id);
alter table public.user_documents add constraint user_documents_not_self check (origin_document_id is distinct from id);
alter table public.social_posts add constraint social_posts_agent_fk foreign key(created_by_agent_id) references public.personal_agents(id) on delete set null;
alter table public.social_post_targets add constraint social_targets_approval_fk foreign key(approval_request_id) references public.approval_requests(id) on delete set null;
create trigger user_documents_updated_at before update on public.user_documents for each row execute function public.set_updated_at();
create index social_posts_recovery_0_idx on public.social_posts(user_id,created_at desc);
create index social_posts_recovery_1_idx on public.social_posts(created_by_agent_id);
create index social_post_targets_recovery_0_idx on public.social_post_targets(user_id,created_at desc);
create index social_post_targets_recovery_1_idx on public.social_post_targets(approval_request_id);
create index web_crawl_jobs_recovery_0_idx on public.web_crawl_jobs(user_id,created_at desc);
create index voice_clone_jobs_recovery_0_idx on public.voice_clone_jobs(user_id,created_at desc);
create index user_documents_recovery_0_idx on public.user_documents(user_id,updated_at desc);
create index user_documents_recovery_1_idx on public.user_documents(origin_document_id,user_id);
create index social_posts_owner_schedule_idx on public.social_posts(user_id,scheduled_for) where status in ('scheduled','publishing');

alter table public.social_posts enable row level security;
revoke all on public.social_posts from anon,authenticated;
grant select,insert,update,delete on public.social_posts to authenticated;
grant all on public.social_posts to service_role;
create policy social_posts_recovery_select on public.social_posts for select to authenticated using (user_id=(select auth.uid()));
create policy social_posts_recovery_insert on public.social_posts for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (created_by_agent_id is null or exists(select 1 from public.personal_agents p where p.id=created_by_agent_id and p.user_id=(select auth.uid()))));
create policy social_posts_recovery_update on public.social_posts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (created_by_agent_id is null or exists(select 1 from public.personal_agents p where p.id=created_by_agent_id and p.user_id=(select auth.uid()))));
create policy social_posts_recovery_delete on public.social_posts for delete to authenticated using (user_id=(select auth.uid()));

alter table public.social_post_targets enable row level security;
revoke all on public.social_post_targets from anon,authenticated;
grant select,insert,update,delete on public.social_post_targets to authenticated;
grant all on public.social_post_targets to service_role;
create policy social_post_targets_recovery_select on public.social_post_targets for select to authenticated using (user_id=(select auth.uid()));
create policy social_post_targets_recovery_insert on public.social_post_targets for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and p.user_id=(select auth.uid())) and (approval_request_id is null or exists(select 1 from public.approval_requests p where p.id=approval_request_id and p.user_id=(select auth.uid()))));
create policy social_post_targets_recovery_update on public.social_post_targets for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and p.user_id=(select auth.uid())) and (approval_request_id is null or exists(select 1 from public.approval_requests p where p.id=approval_request_id and p.user_id=(select auth.uid()))));
create policy social_post_targets_recovery_delete on public.social_post_targets for delete to authenticated using (user_id=(select auth.uid()));

alter table public.notification_endpoints enable row level security;
revoke all on public.notification_endpoints from anon,authenticated;
grant select,insert,update,delete on public.notification_endpoints to authenticated;
grant all on public.notification_endpoints to service_role;
create policy notification_endpoints_recovery_select on public.notification_endpoints for select to authenticated using (user_id=(select auth.uid()));
create policy notification_endpoints_recovery_insert on public.notification_endpoints for insert to authenticated with check (user_id=(select auth.uid()));
create policy notification_endpoints_recovery_update on public.notification_endpoints for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy notification_endpoints_recovery_delete on public.notification_endpoints for delete to authenticated using (user_id=(select auth.uid()));

alter table public.web_crawl_jobs enable row level security;
revoke all on public.web_crawl_jobs from anon,authenticated;
grant select,insert,update,delete on public.web_crawl_jobs to authenticated;
grant all on public.web_crawl_jobs to service_role;
create policy web_crawl_jobs_recovery_select on public.web_crawl_jobs for select to authenticated using (user_id=(select auth.uid()));
create policy web_crawl_jobs_recovery_insert on public.web_crawl_jobs for insert to authenticated with check (user_id=(select auth.uid()));
create policy web_crawl_jobs_recovery_update on public.web_crawl_jobs for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy web_crawl_jobs_recovery_delete on public.web_crawl_jobs for delete to authenticated using (user_id=(select auth.uid()));

alter table public.voice_clone_jobs enable row level security;
revoke all on public.voice_clone_jobs from anon,authenticated;
grant select,insert,update,delete on public.voice_clone_jobs to authenticated;
grant all on public.voice_clone_jobs to service_role;
create policy voice_clone_jobs_recovery_select on public.voice_clone_jobs for select to authenticated using (user_id=(select auth.uid()));
create policy voice_clone_jobs_recovery_insert on public.voice_clone_jobs for insert to authenticated with check (user_id=(select auth.uid()));
create policy voice_clone_jobs_recovery_update on public.voice_clone_jobs for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy voice_clone_jobs_recovery_delete on public.voice_clone_jobs for delete to authenticated using (user_id=(select auth.uid()));

alter table public.user_documents enable row level security;
revoke all on public.user_documents from anon,authenticated;
grant select,insert,update,delete on public.user_documents to authenticated;
grant all on public.user_documents to service_role;
create policy user_documents_recovery_select on public.user_documents for select to authenticated using (user_id=(select auth.uid()));
create policy user_documents_recovery_insert on public.user_documents for insert to authenticated with check (user_id=(select auth.uid()));
create policy user_documents_recovery_update on public.user_documents for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy user_documents_recovery_delete on public.user_documents for delete to authenticated using (user_id=(select auth.uid()));
