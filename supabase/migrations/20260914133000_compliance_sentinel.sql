-- Blackstar Regulations & Compliance Sentinel
-- Shared authoritative regulatory catalogue + per-user compliance operations.
-- Normal authenticated users can read the shared catalogue but only the service role
-- can mutate it. User-owned compliance records follow the existing Blackstar Legal/Industry
-- isolation convention: user_id = auth.uid().

create or replace function public.compliance_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.compliance_regulatory_sources (
  id uuid primary key default gen_random_uuid(),
  regulator text not null,
  jurisdiction text not null,
  title text not null,
  source_type text not null default 'website' check (source_type in ('api','feed','website','bulk_data','manual')),
  canonical_url text not null,
  api_url text,
  adapter text not null default 'manual',
  authority_level text not null default 'official' check (authority_level in ('official','delegated','reference')),
  active boolean not null default true,
  automation_ready boolean not null default false,
  check_interval_hours integer not null default 24 check (check_interval_hours between 1 and 720),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  next_check_at timestamptz not null default now(),
  etag text,
  last_modified text,
  content_hash text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_url)
);

create table if not exists public.compliance_regulations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.compliance_regulatory_sources(id) on delete restrict,
  regulator_reference text,
  title text not null,
  jurisdiction text not null,
  domains text[] not null default '{}'::text[],
  sectors text[] not null default '{}'::text[],
  status text not null default 'in_force' check (status in ('proposed','adopted','in_force','amended','repealed','superseded','withdrawn','unknown')),
  issued_on date,
  effective_on date,
  repealed_on date,
  summary text,
  canonical_url text not null,
  current_version_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, canonical_url)
);

create table if not exists public.compliance_regulation_versions (
  id uuid primary key default gen_random_uuid(),
  regulation_id uuid not null references public.compliance_regulations(id) on delete cascade,
  version_label text,
  effective_from date,
  effective_to date,
  source_url text not null,
  content_hash text not null,
  content_text text,
  structured_content jsonb not null default '{}'::jsonb,
  diff_summary text,
  provenance jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (regulation_id, content_hash)
);

alter table public.compliance_regulations
  drop constraint if exists compliance_regulations_current_version_id_fkey;
alter table public.compliance_regulations
  add constraint compliance_regulations_current_version_id_fkey
  foreign key (current_version_id) references public.compliance_regulation_versions(id) on delete set null;

create table if not exists public.compliance_regulatory_changes (
  id uuid primary key default gen_random_uuid(),
  regulation_id uuid not null references public.compliance_regulations(id) on delete cascade,
  previous_version_id uuid references public.compliance_regulation_versions(id) on delete set null,
  current_version_id uuid references public.compliance_regulation_versions(id) on delete set null,
  change_type text not null default 'updated' check (change_type in ('new','updated','effective_date','status','repealed','superseded','correction')),
  severity text not null default 'medium' check (severity in ('info','low','medium','high','critical')),
  authoritative boolean not null default true,
  detected_at timestamptz not null default now(),
  effective_at timestamptz,
  summary text,
  review_required boolean not null default true,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  organisation_context text,
  jurisdictions text[] not null default '{}'::text[],
  sectors text[] not null default '{}'::text[],
  products_services text[] not null default '{}'::text[],
  risk_appetite text not null default 'standard' check (risk_appetite in ('conservative','standard','elevated')),
  framework_preferences text[] not null default '{}'::text[],
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_applicability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete cascade,
  regulation_id uuid not null references public.compliance_regulations(id) on delete cascade,
  status text not null default 'review' check (status in ('review','applicable','partially_applicable','not_applicable','out_of_scope')),
  rationale text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  determination_source text not null default 'human_review' check (determination_source in ('human_review','blackstar_assist','imported')),
  reviewed_by text,
  reviewed_at timestamptz,
  next_review_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, profile_id, regulation_id)
);

create table if not exists public.compliance_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete set null,
  regulation_id uuid references public.compliance_regulations(id) on delete set null,
  regulation_version_id uuid references public.compliance_regulation_versions(id) on delete set null,
  title text not null,
  requirement text not null,
  jurisdiction text,
  category text not null default 'general',
  owner_name text,
  status text not null default 'review' check (status in ('review','planned','implemented','monitoring','exception','not_applicable')),
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  effective_on date,
  due_on date,
  last_reviewed_at timestamptz,
  next_review_on date,
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_controls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete set null,
  control_code text,
  title text not null,
  description text,
  framework text,
  control_type text not null default 'preventive' check (control_type in ('preventive','detective','corrective','directive','compensating')),
  frequency text,
  owner_name text,
  implementation_status text not null default 'designed' check (implementation_status in ('planned','designed','implemented','operating','deficient','retired')),
  testing_status text not null default 'untested' check (testing_status in ('untested','scheduled','effective','partially_effective','ineffective')),
  last_tested_at timestamptz,
  next_test_on date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_control_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  obligation_id uuid not null references public.compliance_obligations(id) on delete cascade,
  control_id uuid not null references public.compliance_controls(id) on delete cascade,
  coverage text not null default 'partial' check (coverage in ('full','partial','supporting','gap')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, obligation_id, control_id)
);

create table if not exists public.compliance_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete set null,
  title text not null,
  assessment_type text not null default 'compliance' check (assessment_type in ('compliance','control','readiness','gap','risk','vendor')),
  scope text,
  status text not null default 'draft' check (status in ('draft','in_progress','review','complete','archived')),
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  started_at timestamptz,
  completed_at timestamptz,
  assessor text,
  findings_summary text,
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  obligation_id uuid references public.compliance_obligations(id) on delete set null,
  control_id uuid references public.compliance_controls(id) on delete set null,
  assessment_id uuid references public.compliance_assessments(id) on delete set null,
  title text not null,
  evidence_type text not null default 'document',
  storage_ref text,
  external_url text,
  description text,
  content_hash text,
  collected_at timestamptz not null default now(),
  valid_until date,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','expired','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete set null,
  assessment_id uuid references public.compliance_assessments(id) on delete set null,
  obligation_id uuid references public.compliance_obligations(id) on delete set null,
  control_id uuid references public.compliance_controls(id) on delete set null,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','accepted','remediating','resolved','closed')),
  owner_name text,
  remediation_plan text,
  due_on date,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete cascade,
  name text not null,
  jurisdictions text[] not null default '{}'::text[],
  regulators text[] not null default '{}'::text[],
  domains text[] not null default '{}'::text[],
  minimum_severity text not null default 'medium' check (minimum_severity in ('info','low','medium','high','critical')),
  channels text[] not null default array['in_app']::text[],
  active boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.compliance_regulatory_sources(id) on delete cascade,
  status text not null default 'running' check (status in ('running','success','partial','failed','skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  http_status integer,
  items_seen integer not null default 0,
  versions_created integer not null default 0,
  changes_created integer not null default 0,
  error text,
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists compliance_sources_due_idx on public.compliance_regulatory_sources(active, automation_ready, next_check_at);
create index if not exists compliance_regulations_jurisdiction_status_idx on public.compliance_regulations(jurisdiction, status);
create index if not exists compliance_regulations_source_idx on public.compliance_regulations(source_id, updated_at desc);
create index if not exists compliance_versions_regulation_idx on public.compliance_regulation_versions(regulation_id, captured_at desc);
create index if not exists compliance_changes_detected_idx on public.compliance_regulatory_changes(detected_at desc, severity);
create index if not exists compliance_profiles_user_idx on public.compliance_profiles(user_id, active);
create index if not exists compliance_applicability_user_idx on public.compliance_applicability(user_id, status, updated_at desc);
create index if not exists compliance_obligations_user_idx on public.compliance_obligations(user_id, status, risk_level, due_on);
create index if not exists compliance_controls_user_idx on public.compliance_controls(user_id, implementation_status, testing_status);
create index if not exists compliance_assessments_user_idx on public.compliance_assessments(user_id, status, updated_at desc);
create index if not exists compliance_findings_user_idx on public.compliance_findings(user_id, status, severity, due_on);
create index if not exists compliance_alerts_user_idx on public.compliance_alerts(user_id, active);
create index if not exists compliance_sync_runs_source_idx on public.compliance_sync_runs(source_id, started_at desc);

-- Keep mutable operational rows timestamped consistently.
do $$
declare t text;
begin
  foreach t in array array[
    'compliance_regulatory_sources','compliance_regulations','compliance_profiles',
    'compliance_applicability','compliance_obligations','compliance_controls',
    'compliance_control_mappings','compliance_assessments','compliance_evidence',
    'compliance_findings','compliance_alerts'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.compliance_set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;

-- RLS: authoritative catalogue is readable by authenticated users and writable only by service role.
alter table public.compliance_regulatory_sources enable row level security;
alter table public.compliance_regulations enable row level security;
alter table public.compliance_regulation_versions enable row level security;
alter table public.compliance_regulatory_changes enable row level security;
alter table public.compliance_sync_runs enable row level security;

drop policy if exists compliance_sources_read_authenticated on public.compliance_regulatory_sources;
create policy compliance_sources_read_authenticated on public.compliance_regulatory_sources for select to authenticated using (true);
drop policy if exists compliance_regulations_read_authenticated on public.compliance_regulations;
create policy compliance_regulations_read_authenticated on public.compliance_regulations for select to authenticated using (true);
drop policy if exists compliance_versions_read_authenticated on public.compliance_regulation_versions;
create policy compliance_versions_read_authenticated on public.compliance_regulation_versions for select to authenticated using (true);
drop policy if exists compliance_changes_read_authenticated on public.compliance_regulatory_changes;
create policy compliance_changes_read_authenticated on public.compliance_regulatory_changes for select to authenticated using (true);
-- sync runs intentionally have no authenticated policy; service role only.

-- RLS: user-owned operational records.
alter table public.compliance_profiles enable row level security;
alter table public.compliance_applicability enable row level security;
alter table public.compliance_obligations enable row level security;
alter table public.compliance_controls enable row level security;
alter table public.compliance_control_mappings enable row level security;
alter table public.compliance_assessments enable row level security;
alter table public.compliance_evidence enable row level security;
alter table public.compliance_findings enable row level security;
alter table public.compliance_alerts enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'compliance_profiles','compliance_applicability','compliance_obligations',
    'compliance_controls','compliance_control_mappings','compliance_assessments',
    'compliance_evidence','compliance_findings','compliance_alerts'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_delete_own', t);
  end loop;
end $$;

-- Starter coverage registry. These rows are source declarations, not a claim that every
-- document is already ingested. automation_ready stays false until a tested adapter is deployed.
insert into public.compliance_regulatory_sources
  (regulator, jurisdiction, title, source_type, canonical_url, adapter, authority_level, automation_ready, metadata)
values
  ('Financial Conduct Authority', 'United Kingdom', 'FCA Handbook', 'api', 'https://handbook.fca.org.uk/', 'fca_handbook', 'official', false, '{"coverage":"rules_and_guidance","history":"website_timeline"}'::jsonb),
  ('UK Government', 'United Kingdom', 'UK Legislation', 'website', 'https://www.legislation.gov.uk/', 'official_web', 'official', false, '{"coverage":"primary_and_secondary_legislation"}'::jsonb),
  ('European Union', 'European Union', 'EUR-Lex', 'website', 'https://eur-lex.europa.eu/', 'official_web', 'official', false, '{"coverage":"eu_law"}'::jsonb),
  ('U.S. Government Publishing Office', 'United States', 'GovInfo Regulatory & Legislative Data', 'api', 'https://www.govinfo.gov/', 'govinfo', 'official', false, '{"coverage":"federal_register_cfr_statutes","history":"bulk_data"}'::jsonb),
  ('U.S. Securities and Exchange Commission', 'United States', 'SEC Rules and Regulations', 'website', 'https://www.sec.gov/rules-regulations', 'official_web', 'official', false, '{"coverage":"securities_rules"}'::jsonb),
  ('Information Commissioner''s Office', 'United Kingdom', 'ICO Guidance and Regulatory Action', 'website', 'https://ico.org.uk/for-organisations/', 'official_web', 'official', false, '{"coverage":"data_protection_privacy"}'::jsonb),
  ('Prudential Regulation Authority', 'United Kingdom', 'PRA Policy and Rulebook', 'website', 'https://www.bankofengland.co.uk/prudential-regulation', 'official_web', 'official', false, '{"coverage":"prudential_regulation"}'::jsonb),
  ('Competition and Markets Authority', 'United Kingdom', 'CMA Guidance and Decisions', 'website', 'https://www.gov.uk/government/organisations/competition-and-markets-authority', 'official_web', 'official', false, '{"coverage":"competition_consumer_markets"}'::jsonb)
on conflict (canonical_url) do nothing;
