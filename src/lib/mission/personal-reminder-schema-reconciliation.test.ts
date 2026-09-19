import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(
  new URL("../../../supabase/migrations/20260919162500_reconcile_personal_reminder_schema.sql",import.meta.url),
  "utf8",
);

describe("Mission Control reminder production schema",()=>{
  it("restores the original task and reminder identities without dropping data",()=>{
    expect(migration).toContain("create type public.mc_task_status");
    expect(migration).toContain("create table if not exists public.personal_tasks");
    expect(migration).toContain("create table if not exists public.personal_reminders");
    expect(migration).toContain("task_id uuid not null references public.personal_tasks(id)");
    expect(migration).toContain("personal_reminders_task_id_key unique (task_id)");
    expect(migration).not.toMatch(/drop\s+table|truncate\s+table|delete\s+from/i);
  });
  it("keeps reminders owner-scoped and server workers authorised",()=>{
    expect(migration).toContain("alter table public.personal_reminders enable row level security");
    expect(migration).toContain("alter table public.personal_tasks enable row level security");
    expect(migration).toContain("grant all on public.personal_reminders to service_role");
    expect(migration).toContain("for select to authenticated");
    expect(migration).toContain("auth.uid()=user_id and status='scheduled'");
    expect(migration).toContain("auth.uid()=user_id and status='cancelled'");
  });
});
