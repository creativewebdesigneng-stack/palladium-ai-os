-- External MCP server registry used by MCP Hub, agent runtime and Universal AI Hub.
-- Keeps credentials encrypted at rest in auth_header_ciphertext and exposes rows only to their owner.

create table if not exists public.external_mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid null,
  name text not null,
  slug text not null,
  endpoint_url text not null,
  auth_header_name text null,
  auth_header_ciphertext text null,
  enabled boolean not null default true,
  requires_approval boolean not null default true,
  allowed_tool_names text[] not null default '{}'::text[],
  cached_tools jsonb not null default '[]'::jsonb,
  last_discovered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_mcp_servers_name_len check (char_length(name) between 1 and 120),
  constraint external_mcp_servers_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  constraint external_mcp_servers_endpoint_https check (endpoint_url ~* '^https://')
);

create unique index if not exists external_mcp_servers_user_slug_uidx
  on public.external_mcp_servers(user_id, slug);
create index if not exists external_mcp_servers_user_enabled_idx
  on public.external_mcp_servers(user_id, enabled);
create index if not exists external_mcp_servers_org_idx
  on public.external_mcp_servers(org_id)
  where org_id is not null;

alter table public.external_mcp_servers enable row level security;

drop policy if exists external_mcp_servers_select_own on public.external_mcp_servers;
drop policy if exists external_mcp_servers_insert_own on public.external_mcp_servers;
drop policy if exists external_mcp_servers_update_own on public.external_mcp_servers;
drop policy if exists external_mcp_servers_delete_own on public.external_mcp_servers;

create policy external_mcp_servers_select_own
  on public.external_mcp_servers
  for select to authenticated
  using (user_id = auth.uid());

create policy external_mcp_servers_insert_own
  on public.external_mcp_servers
  for insert to authenticated
  with check (user_id = auth.uid());

create policy external_mcp_servers_update_own
  on public.external_mcp_servers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy external_mcp_servers_delete_own
  on public.external_mcp_servers
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.external_mcp_servers to authenticated;

notify pgrst, 'reload schema';
