-- PalladiumAI browser credentials for trusted browser automation.
-- Secret payloads are application-encrypted before they reach Postgres. The
-- model/runtime tool layer never reads ciphertext directly or accepts secrets.

create table if not exists public.browser_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null,
  domain text not null,
  username_ciphertext text null,
  password_ciphertext text null,
  totp_secret_ciphertext text null,
  totp_identifier text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz null,
  constraint browser_credentials_name_length check (char_length(name) between 1 and 120),
  constraint browser_credentials_domain_length check (char_length(domain) between 1 and 253),
  constraint browser_credentials_secret_present check (
    username_ciphertext is not null or password_ciphertext is not null or totp_secret_ciphertext is not null
  )
);

create unique index if not exists browser_credentials_user_name_unique
  on public.browser_credentials(user_id, lower(name));
create index if not exists browser_credentials_user_domain_idx
  on public.browser_credentials(user_id, lower(domain));

alter table public.browser_credentials enable row level security;

drop policy if exists "browser_credentials_select_own" on public.browser_credentials;
create policy "browser_credentials_select_own"
  on public.browser_credentials for select
  using (auth.uid() = user_id);

drop policy if exists "browser_credentials_insert_own" on public.browser_credentials;
create policy "browser_credentials_insert_own"
  on public.browser_credentials for insert
  with check (auth.uid() = user_id);

drop policy if exists "browser_credentials_update_own" on public.browser_credentials;
create policy "browser_credentials_update_own"
  on public.browser_credentials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "browser_credentials_delete_own" on public.browser_credentials;
create policy "browser_credentials_delete_own"
  on public.browser_credentials for delete
  using (auth.uid() = user_id);

comment on table public.browser_credentials is
  'Owner-scoped encrypted credentials used only by the trusted browser runtime. Ciphertext is AES-256-GCM application encrypted.';
