import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(
  new URL("../../../../supabase/migrations/20260919161000_reconcile_webhook_queue_schema.sql",import.meta.url),
  "utf8",
);

describe("production webhook queue schema reconciliation",()=>{
  it("restores the exact durable tables consumed by webhook dispatch and retry",()=>{
    expect(migration).toContain("create table if not exists public.webhooks");
    expect(migration).toContain("create table if not exists public.webhook_deliveries");
    for(const field of ["signing_secret text","delivery_count bigint","next_attempt_at timestamptz","last_attempt_at timestamptz","dead_lettered_at timestamptz"]){
      expect(migration).toContain(field);
    }
  });

  it("keeps the signing secret and delivery mutations backend-only",()=>{
    expect(migration).toContain("revoke all on public.webhooks from public, anon, authenticated");
    expect(migration).toContain("revoke all on public.webhook_deliveries from public,anon,authenticated");
    expect(migration).toContain("grant all on public.webhook_deliveries to service_role");
    expect(migration).not.toMatch(/grant\s+select\s+on\s+public\.webhooks\s+to\s+authenticated/i);
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+public\.webhook_deliveries\s+to\s+authenticated/i);
  });

  it("enforces user-scoped subscriptions and read-only user delivery history",()=>{
    expect(migration).toContain("alter table public.webhooks enable row level security");
    expect(migration).toContain("alter table public.webhook_deliveries enable row level security");
    expect(migration).toContain("user_id=auth.uid()");
    expect(migration).toContain("for select to authenticated using (user_id=auth.uid())");
    expect(migration).toContain("for insert to authenticated with check (user_id=auth.uid() and org_id is null)");
  });
});
