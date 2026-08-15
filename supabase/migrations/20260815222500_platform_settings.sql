-- Server-only platform configuration. No browser/user RLS policies are added;
-- trusted server code reaches this table through the service-role client after
-- authenticating and authorising the caller.
create table if not exists public.platform_settings (
  key text primary key check (char_length(key) between 1 and 80),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

alter table public.platform_settings enable row level security;

insert into public.platform_settings (key, value)
values (
  'announcement',
  '{"enabled":false,"text":"","tone":"info"}'::jsonb
)
on conflict (key) do nothing;

comment on table public.platform_settings is
  'Server-only platform configuration; read/write is mediated by authorised server functions.';
