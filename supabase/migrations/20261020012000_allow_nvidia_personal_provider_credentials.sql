-- Extend the existing encrypted personal model credential store to NVIDIA NIM.
-- No second token store, access grant or browser-readable API.
-- Authenticated server functions continue to enforce user_id ownership.

begin;

alter table public.model_provider_credentials
  drop constraint if exists model_provider_credentials_provider_check;

alter table public.model_provider_credentials
  add constraint model_provider_credentials_provider_check
  check (provider in ('openai', 'anthropic', 'nvidia'));

comment on table public.model_provider_credentials is
  'Server-only owner-scoped encrypted OpenAI/Anthropic/NVIDIA API credentials. Browser roles receive no direct table privileges; authenticated Blackstar server functions enforce ownership.';

commit;
