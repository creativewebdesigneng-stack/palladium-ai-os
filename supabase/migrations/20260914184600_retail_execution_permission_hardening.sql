-- Blackstar Retail Hub: expose only SECURITY INVOKER wrappers while keeping privileged executors outside the API schema.

-- Public SECURITY INVOKER wrappers require authenticated EXECUTE on private helpers,
-- matching the existing inventory executor pattern. The private schema itself is not exposed by PostgREST.
grant execute on function private.retail_adjust_gift_card_impl(uuid,numeric,text,uuid,uuid,text,text) to authenticated;
grant execute on function private.retail_complete_stocktake_impl(uuid) to authenticated;

-- Preserve existing Gift & Store Credit creation while guaranteeing that every initial
-- non-zero balance receives an immutable issue event automatically.
create or replace function private.retail_record_initial_gift_card_issue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.balance > 0 then
    insert into public.retail_gift_card_events (
      user_id, workspace_id, gift_card_id, event_type, amount, balance_after, reference, note
    ) values (
      new.user_id, new.workspace_id, new.id, 'issue', new.balance, new.balance, 'initial_issue', new.notes
    );
  end if;
  return new;
end;
$$;
revoke all on function private.retail_record_initial_gift_card_issue() from public, anon, authenticated;
grant execute on function private.retail_record_initial_gift_card_issue() to service_role;

drop trigger if exists retail_gift_cards_initial_issue_event on public.retail_gift_cards;
create trigger retail_gift_cards_initial_issue_event
after insert on public.retail_gift_cards
for each row execute function private.retail_record_initial_gift_card_issue();

create or replace function private.retail_issue_gift_card_impl(
  p_workspace_id uuid,
  p_code text,
  p_value numeric,
  p_currency text default 'GBP',
  p_customer_name text default null,
  p_customer_email text default null,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_card public.retail_gift_cards%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_value <= 0 then raise exception 'gift_card_value_must_be_positive'; end if;
  if length(trim(coalesce(p_code,''))) = 0 then raise exception 'gift_card_code_required'; end if;
  if not exists (select 1 from public.retail_workspaces w where w.id = p_workspace_id and w.user_id = v_user_id) then
    raise exception 'retail_workspace_not_found';
  end if;

  insert into public.retail_gift_cards (
    user_id, workspace_id, code, customer_name, customer_email,
    original_value, balance, currency, status, issued_at, expires_at, notes
  ) values (
    v_user_id, p_workspace_id, trim(p_code), p_customer_name, p_customer_email,
    p_value, p_value, coalesce(nullif(trim(p_currency),''),'GBP'), 'active', now(), p_expires_at, p_note
  ) returning * into v_card;

  -- The AFTER INSERT trigger records the immutable initial issue event.
  return jsonb_build_object('gift_card_id',v_card.id,'balance',v_card.balance,'status',v_card.status,'code',v_card.code);
end;
$$;
revoke all on function private.retail_issue_gift_card_impl(uuid,text,numeric,text,text,text,timestamptz,text) from public, anon;
grant execute on function private.retail_issue_gift_card_impl(uuid,text,numeric,text,text,text,timestamptz,text) to authenticated, service_role;

create or replace function public.retail_issue_gift_card(
  p_workspace_id uuid,
  p_code text,
  p_value numeric,
  p_currency text default 'GBP',
  p_customer_name text default null,
  p_customer_email text default null,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.retail_issue_gift_card_impl(p_workspace_id,p_code,p_value,p_currency,p_customer_name,p_customer_email,p_expires_at,p_note);
$$;
revoke all on function public.retail_issue_gift_card(uuid,text,numeric,text,text,text,timestamptz,text) from public, anon;
grant execute on function public.retail_issue_gift_card(uuid,text,numeric,text,text,text,timestamptz,text) to authenticated, service_role;
