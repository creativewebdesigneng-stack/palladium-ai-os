-- Native Crystal + Memex concept transfer for PalladiumAI.
-- Crystal is MIT; Memex is GPL-3.0, so no Memex source is copied here.
-- These tables add only orchestration/context metadata and reuse existing Projects,
-- Agent Runtime, Memory/Knowledge, approvals and tool audit systems.

create table if not exists public.agent_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  project_id uuid null,
  agent_id uuid null,
  title text not null default 'Untitled workspace',
  objective text not null default '',
  isolation_mode text not null default 'shared' check (isolation_mode in ('shared','worktree')),
  branch_name text null,
  status text not null default 'draft' check (status in ('draft','running','paused','completed','archived')),
  runtime_task_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_workspaces_user_updated_idx on public.agent_workspaces(user_id, updated_at desc);
create index if not exists agent_workspaces_user_status_idx on public.agent_workspaces(user_id, status);

alter table public.agent_workspaces enable row level security;

drop policy if exists "agent_workspaces_owner_select" on public.agent_workspaces;
create policy "agent_workspaces_owner_select" on public.agent_workspaces for select using (auth.uid() = user_id);
drop policy if exists "agent_workspaces_owner_insert" on public.agent_workspaces;
create policy "agent_workspaces_owner_insert" on public.agent_workspaces for insert with check (auth.uid() = user_id);
drop policy if exists "agent_workspaces_owner_update" on public.agent_workspaces;
create policy "agent_workspaces_owner_update" on public.agent_workspaces for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "agent_workspaces_owner_delete" on public.agent_workspaces;
create policy "agent_workspaces_owner_delete" on public.agent_workspaces for delete using (auth.uid() = user_id);

create table if not exists public.context_timeline_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  workspace_id uuid null references public.agent_workspaces(id) on delete set null,
  card_kind text not null default 'note' check (card_kind in ('note','task','event','progress','metric','link','person','place','insight')),
  title text not null default 'Untitled context',
  body text not null default '',
  occurred_at timestamptz not null default now(),
  tags text[] not null default '{}',
  source_kind text not null default 'manual' check (source_kind in ('manual','agent','workflow','project','memory','knowledge')),
  source_id text null,
  knowledge_document_id uuid null,
  pinned boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists context_timeline_user_occurred_idx on public.context_timeline_cards(user_id, occurred_at desc);
create index if not exists context_timeline_workspace_idx on public.context_timeline_cards(user_id, workspace_id, occurred_at desc);

alter table public.context_timeline_cards enable row level security;

drop policy if exists "context_timeline_owner_select" on public.context_timeline_cards;
create policy "context_timeline_owner_select" on public.context_timeline_cards for select using (auth.uid() = user_id);
drop policy if exists "context_timeline_owner_insert" on public.context_timeline_cards;
create policy "context_timeline_owner_insert" on public.context_timeline_cards for insert with check (auth.uid() = user_id);
drop policy if exists "context_timeline_owner_update" on public.context_timeline_cards;
create policy "context_timeline_owner_update" on public.context_timeline_cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "context_timeline_owner_delete" on public.context_timeline_cards;
create policy "context_timeline_owner_delete" on public.context_timeline_cards for delete using (auth.uid() = user_id);
