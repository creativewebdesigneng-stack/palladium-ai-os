import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const functionSource=readFileSync(new URL('../../../supabase/functions/website-studio-form-submit/index.ts',import.meta.url),'utf8');
const migrationSource=readFileSync(new URL('../../../supabase/migrations/20260914094200_website_studio_form_rate_limits.sql',import.meta.url),'utf8');

describe('Website Studio public form abuse controls',()=>{
  it('enforces durable per-client and per-form rate limits in the trusted Edge boundary',()=>{
    expect(functionSource).toContain('const CLIENT_RATE_LIMIT=10;');
    expect(functionSource).toContain('const FORM_RATE_LIMIT=120;');
    expect(functionSource).toContain('const RATE_WINDOW_SECONDS=60;');
    expect(functionSource).toContain('website_studio_form_rate_limit');
    expect(functionSource).toContain('rate_limit_unavailable');
    expect(functionSource).toContain('rate_limited');
    expect(functionSource).toContain('"Retry-After"');
    expect(functionSource).toContain(',429,');
    expect(functionSource.indexOf('const clientLimit=await consumeRateLimit')).toBeLessThan(functionSource.indexOf('const globalLimit=await consumeRateLimit'));
  });

  it('keeps rate-limit persistence inaccessible to public browser roles',()=>{
    expect(migrationSource).toContain('alter table public.website_studio_form_rate_limits enable row level security;');
    expect(migrationSource).toContain('revoke all on table public.website_studio_form_rate_limits from public, anon, authenticated;');
    expect(migrationSource).toContain('revoke all on function public.website_studio_form_rate_limit(uuid, text, text, integer, integer)');
    expect(migrationSource).toContain('from public, anon, authenticated;');
    expect(migrationSource).toContain('to service_role;');
    expect(migrationSource).toContain("p_identity_hash !~ '^[0-9a-f]{64}$'");
  });
});
