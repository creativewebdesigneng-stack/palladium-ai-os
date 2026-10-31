-- Candidate enterprise Knowledge audit boundary. DRAFT / REVIEW ONLY.
-- Depends on 20261030003000_enterprise_knowledge_explicit_org_read.sql.
-- Audit and direct authenticated Data API writes share one transaction:
-- if the audit insert fails, the document mutation is rolled back.
create function private.enterprise_knowledge_share_audit()
returns trigger
language plpgsql security definer
set search_path = ''
as $enterprise_knowledge_share_audit$
declare
  old_shared boolean := false;
  new_shared boolean;
  state_changed boolean;
  actor uuid;
begin
  new_shared := coalesce(new.metadata @> '{"enterprise_shared":true}'::jsonb, false);
  if tg_op = 'UPDATE' then
    old_shared := coalesce(old.metadata @> '{"enterprise_shared":true}'::jsonb, false);
    -- A shared document must be revoked before changing its organisation.
    if old.org_id is distinct from new.org_id and (old_shared or new_shared) then
      raise exception 'Revoke enterprise sharing before moving a document between scopes.';
    end if;
  end if;

  state_changed := old_shared is distinct from new_shared;
  if tg_op = 'UPDATE' and (old_shared or new_shared) then
    state_changed := state_changed
      or (old.status is distinct from new.status)
      or (old.agent_id is distinct from new.agent_id);
  end if;

  if state_changed then
    actor := (select auth.uid());
    -- Fail closed on unattributed admin/backfill or non-admin writes.
    -- The actor must be the document owner and a current org administrator.
    if actor is null or actor is distinct from new.user_id
       or new.org_id is null or not private.is_org_admin(new.org_id) then
      raise exception 'Enterprise sharing change requires an authenticated document-owner organisation administrator.';
    end if;
    insert into public.mission_audit_logs
      (user_id,org_id,action,target_type,target_id,status,metadata)
    values
      (actor,new.org_id,'enterprise_knowledge_share_changed','memory_document',new.id::text,
       'success',jsonb_build_object(
         'shared',new_shared,
         'previous_shared',old_shared,
         'ready',new.status = 'ready',
         'non_agent',new.agent_id is null,
         'origin','database_trigger'));
  end if;
  return new;
end;
$enterprise_knowledge_share_audit$;

revoke all on function private.enterprise_knowledge_share_audit() from public, anon, authenticated;

create trigger enterprise_knowledge_share_audit
  after insert or update of metadata,org_id,status,agent_id
  on public.memory_documents
  for each row execute function private.enterprise_knowledge_share_audit();

comment on function private.enterprise_knowledge_share_audit() is
'Atomic redacted audit for changes to enterprise_shared and shared document visibility. Unattributed mutations fail closed. Trigger-only; no public execute grant.';
