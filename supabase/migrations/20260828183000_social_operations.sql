-- PalladiumAI Social Operations
-- Clean-room implementation inspired by social scheduling concepts audited from TryPost.
-- No AGPL source code is copied into this repository.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
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

create table if not exists public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null default auth.uid(),
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

create index if not exists social_posts_owner_schedule_idx
  on public.social_posts(user_id, scheduled_for)
  where status in ('scheduled','publishing');
create index if not exists social_posts_owner_created_idx
  on public.social_posts(user_id, created_at desc);
create index if not exists social_post_targets_post_idx
  on public.social_post_targets(post_id, status);
create index if not exists social_post_targets_owner_idx
  on public.social_post_targets(user_id, created_at desc);

alter table public.social_posts enable row level security;
alter table public.social_post_targets enable row level security;

create policy "social_posts_owner_select" on public.social_posts
  for select using (auth.uid() = user_id);
create policy "social_posts_owner_insert" on public.social_posts
  for insert with check (auth.uid() = user_id);
create policy "social_posts_owner_update" on public.social_posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "social_posts_owner_delete" on public.social_posts
  for delete using (auth.uid() = user_id);

create policy "social_post_targets_owner_select" on public.social_post_targets
  for select using (auth.uid() = user_id);
create policy "social_post_targets_owner_insert" on public.social_post_targets
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.social_posts p where p.id = post_id and p.user_id = auth.uid()
    )
  );
create policy "social_post_targets_owner_update" on public.social_post_targets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "social_post_targets_owner_delete" on public.social_post_targets
  for delete using (auth.uid() = user_id);

comment on table public.social_posts is 'Provider-neutral social content plans managed by PalladiumAI.';
comment on table public.social_post_targets is 'Live integration capability targets for social content. Credentials are never stored here.';
