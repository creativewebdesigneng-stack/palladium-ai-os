-- Server-only encrypted personal model provider credentials.
-- Browser roles receive no Data API privileges. Blackstar authenticated server
-- functions enforce ownership and use the service role to persist ciphertext.

create table if not exists public.model_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic')),
  label text not null default '',
  api_key_ciphertext text not null check (char_length(api_key_ciphertext) between 20 and 16384),
  enabled boolean not null default true,
  verified_at timestamptz null,
  last_used_at timestamptz null,
  last_error text null check (last_error is null or char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_provider_credentials_user_provider_key unique (user_id, provider),
  constraint model_provider_credentials_label_check check (char_length(label) <= 120)
);

alter table public.model_provider_credentials enable row level security;

revoke all privileges on table public.model_provider_credentials from public, anon, authenticated;
grant all privileges on table public.model_provider_credentials to service_role;

drop policy if exists model_provider_credentials_deny_browser_roles on public.model_provider_credentials;
create policy model_provider_credentials_deny_browser_roles
on public.model_provider_credentials
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.model_provider_credentials is
  'Server-only owner-scoped encrypted OpenAI/Anthropic API credentials. Browser roles receive no direct table privileges; authenticated Blackstar server functions enforce ownership.';
comment on column public.model_provider_credentials.api_key_ciphertext is
  'AES-256-GCM ciphertext encrypted with the existing Blackstar integration token key. Plaintext API keys are never persisted.';
