-- External MCP server registrations are tenant-owned and credentials are stored
-- encrypted by the server runtime before persistence. The browser never receives
-- auth_header_ciphertext.
create table if not exists public.external_mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  endpoint_url text not null check (endpoint_url ~ '^https://'),
  auth_header_name text null check (
    auth_header_name is null or auth_header_name ~ '^[A-Za-z][A-Za-z0-9-]{0,63}$'
  ),
  auth_header_ciphertext text null,
  enabled boolean not null default true,
  requires_approval boolean not null default true,
  allowed_tool_names text[] not null default '{}'::text[],
  cached_tools jsonb not null default '[]'::jsonb,
  last_discovered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists external_mcp_servers_user_enabled_idx
  on public.external_mcp_servers (user_id, enabled);

alter table public.external_mcp_servers enable row level security;

-- Keep policy creation migration-safe across preview/prod replays.
drop policy if exists "external_mcp_servers_select_own" on public.external_mcp_servers;
create policy "external_mcp_servers_select_own"
  on public.external_mcp_servers for select
  using (auth.uid() = user_id);

drop policy if exists "external_mcp_servers_insert_own" on public.external_mcp_servers;
create policy "external_mcp_servers_insert_own"
  on public.external_mcp_servers for insert
  with check (auth.uid() = user_id);

drop policy if exists "external_mcp_servers_update_own" on public.external_mcp_servers;
create policy "external_mcp_servers_update_own"
  on public.external_mcp_servers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "external_mcp_servers_delete_own" on public.external_mcp_servers;
create policy "external_mcp_servers_delete_own"
  on public.external_mcp_servers for delete
  using (auth.uid() = user_id);

comment on table public.external_mcp_servers is
  'User-owned external Model Context Protocol HTTP servers. Auth header values are AES-GCM ciphertext produced server-side.';
comment on column public.external_mcp_servers.auth_header_ciphertext is
  'Encrypted secret only. Never return this column to browser callers.';