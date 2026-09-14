-- Blackstar Compliance Sentinel: activate verified first-party regulatory feeds.
-- These feeds require no third-party API credentials and are monitored hourly by the existing scheduler.

update public.compliance_regulatory_sources
set
  source_type = 'feed',
  adapter = 'official_feed',
  api_url = 'https://www.legislation.gov.uk/all/data.feed?sort=modified&results-count=100',
  automation_ready = true,
  check_interval_hours = 1,
  next_check_at = now(),
  last_error = null,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'feed_kind', 'atom',
    'coverage', 'new and modified UK legislation',
    'verification', 'official_legislation_gov_uk_feed'
  ),
  updated_at = now()
where id = '623d0ad9-ff13-48d0-9d67-3e565c50bc07'::uuid;

update public.compliance_regulatory_sources
set
  title = 'GovInfo Federal Register',
  source_type = 'feed',
  adapter = 'official_feed',
  api_url = 'https://www.govinfo.gov/rss/fr.xml',
  automation_ready = true,
  check_interval_hours = 1,
  next_check_at = now(),
  last_error = null,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'feed_kind', 'rss',
    'coverage', 'new and updated Federal Register content',
    'verification', 'official_govinfo_feed'
  ),
  updated_at = now()
where id = '6a3e0738-48dc-462c-8321-8cc7341b1572'::uuid;

insert into public.compliance_regulatory_sources (
  regulator,
  jurisdiction,
  title,
  source_type,
  canonical_url,
  api_url,
  adapter,
  authority_level,
  active,
  automation_ready,
  check_interval_hours,
  next_check_at,
  metadata
)
select
  'U.S. Government Publishing Office',
  'United States',
  'GovInfo Electronic Code of Federal Regulations',
  'feed',
  'https://www.govinfo.gov/feeds',
  'https://www.govinfo.gov/rss/ecfr-bulkdata.xml',
  'official_feed',
  'official',
  true,
  true,
  1,
  now(),
  jsonb_build_object(
    'feed_kind', 'rss',
    'coverage', 'Electronic Code of Federal Regulations bulk-data updates',
    'verification', 'official_govinfo_feed'
  )
where not exists (
  select 1
  from public.compliance_regulatory_sources s
  where s.api_url = 'https://www.govinfo.gov/rss/ecfr-bulkdata.xml'
);
