import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(
 new URL("../../../supabase/migrations/20260919182000_reconcile_agent_versions_skills.sql",import.meta.url),
 "utf8",
);

describe("agent versions and skill playbook production schema",()=>{
 it("restores the canonical version and scanned playbook records",()=>{
   expect(migration).toContain("create table if not exists public.agent_versions");
   expect(migration).toContain("unique(agent_id,version)");
   expect(migration).toContain("create table if not exists public.agent_skills");
   expect(migration).toContain("requires_tools text[]");
   expect(migration).toContain("requires_scripts text[]");
   expect(migration).toContain("source_ref text null");
   expect(migration).toContain("scan_verdict text not null default 'ok'");
   expect(migration).toContain("check(scan_verdict in ('ok','warning','dangerous'))");
 });
 it("preserves owner-only write policies and excludes anonymous reads",()=>{
   expect(migration).toContain("revoke all on public.agent_versions from public,anon,authenticated");
   expect(migration).toContain("revoke all on public.agent_skills from public,anon,authenticated");
   expect(migration).toContain("created_by=(select auth.uid())");
   expect(migration).toContain("a.user_id=(select auth.uid())");
   expect(migration).toContain("for update to authenticated using(user_id=(select auth.uid()))");
 });
 it("does not create an execution permission or silently schedule autonomous skills",()=>{
   expect(migration).not.toContain("security definer");
   expect(migration).not.toContain("cron.schedule(");
   expect(migration).not.toContain("grant execute");
   expect(migration).not.toContain("create table if not exists public.approval_requests");
 });
});
