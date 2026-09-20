import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(
  new URL('../../../../supabase/migrations/20260920184500_reconcile_core_agent_memory.sql',import.meta.url),
  'utf8',
);

describe('private agent memory schema reconciliation',()=>{
  it('restores the canonical core storage and user preference records',()=>{
    for(const table of ['personal_memories','memory_preferences','agent_memories']){
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    for(const field of ['auto_capture boolean not null default true','capture_sensitive boolean not null default false',
      'organisation_sharing_enabled boolean not null default false','short_term_ttl_minutes integer not null default 720',
      'vector_status text not null default \'pending\'','expires_at timestamptz']){
      expect(migration).toContain(field);
    }
  });
  it('allows only an owner to read or change private memory',()=>{
    expect(migration).toContain('from public,anon,authenticated');
    expect(migration).toContain('grant all on public.personal_memories,public.memory_preferences,public.agent_memories to service_role');
    for(const table of ['personal_memories','memory_preferences','agent_memories']){
      for(const operation of ['select','insert','update','delete']){
        expect(migration).toContain(`create policy ${table}_owner_${operation}`);
      }
    }
    expect(migration).toContain('a.id=agent_id and a.user_id=(select auth.uid())');
  });
  it('does not grant cross-user organisation access or invent a vector search result',()=>{
    expect(migration).not.toContain('cron.schedule(');
    expect(migration).not.toContain('create policy agent_memories_org');
    expect(migration).not.toContain('create or replace function public.search_agent_memories');
  });
});
