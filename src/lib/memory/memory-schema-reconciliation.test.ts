import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260920194000_reconcile_agent_memory_store.sql", import.meta.url),
  "utf8",
);

describe("Blackstar production memory-store reconciliation", () => {
  it("restores all of the existing runtime's storage layers without creating parallel systems", () => {
    for (const table of [
      "personal_memories",
      "memory_preferences",
      "memory_documents",
      "agent_memories",
      "memory_chunks",
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from public,anon,authenticated`);
    }
    expect(migration).toContain("create extension if not exists vector with schema extensions");
    expect(migration).toContain("embedding extensions.vector(1536)");
    expect(migration).toContain("memory_type in ('short_term','long_term','knowledge','organisation')");
  });

  it("keeps sensitive capture disabled and memory sharing opt-in", () => {
    expect(migration).toContain("capture_sensitive boolean not null default false");
    expect(migration).toContain("organisation_sharing_enabled boolean not null default false");
    expect(migration).toContain("scope text not null default 'private'");
    expect(migration).toContain("scope in ('shared','organisation') and private.is_org_member(org_id)");
    expect(migration).toContain("memory_preferences_owner_only");
    expect(migration).toContain("user_id=(select auth.uid())");
  });

  it("restricts writes and linked records to their owner", () => {
    for (const table of ["agent_memories", "memory_chunks", "memory_documents", "personal_memories"]) {
      expect(migration).toContain(`grant all on public.${table} to service_role`);
    }
    for (const name of ["agent_memories_owner_insert", "agent_memories_owner_update", "agent_memories_owner_delete"]) {
      expect(migration).toContain(name);
    }
    expect(migration).toContain("a.id=agent_id and a.user_id=(select auth.uid())");
    expect(migration).toContain("t.id=task_id and t.user_id=(select auth.uid())");
    expect(migration).toContain("d.id=document_id and d.user_id=(select auth.uid())");
    expect(migration).toContain("w.id=workflow_id and w.user_id=(select auth.uid())");
    expect(migration).toContain("memory_documents_owner_only");
  });

  it("preserves RLS for semantic recall and does not start autonomous capture", () => {
    expect(migration).toContain("language sql stable security invoker");
    expect(migration).toContain("revoke all on function public.search_agent_memories");
    expect(migration).toContain("revoke all on function public.search_memory_chunks");
    expect(migration).not.toContain("security definer");
    expect(migration).not.toContain("cron.schedule(");
  });
});
