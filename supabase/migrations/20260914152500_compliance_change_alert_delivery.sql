-- Blackstar Compliance Sentinel: durable regulatory change review + shared notification persistence.
-- Restores the existing Notifications Centre persistence contract and routes future
-- authoritative Sentinel changes into deduplicated, user-owned review work.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  kind text not null,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  title text not null check (char_length(title) <= 200),
  body text check (body is null or char_length(body) <= 500),
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create unique index if not exists notifications_compliance_change_unique_idx
  on public.notifications(user_id, (metadata->>'compliance_change_id'))
  where kind = 'compliance.regulatory_change_detected' and metadata ? 'compliance_change_id';

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant update(read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app boolean not null default true,
  browser_push boolean not null default false,
  browser_push_details boolean not null default false,
  min_severity text not null default 'info' check (min_severity in ('info','success','warning','critical')),
  muted_types text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on table public.notification_preferences from anon, authenticated;
grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant all on table public.notification_preferences to service_role;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_delete_own on public.notification_preferences;
create policy notification_preferences_delete_own on public.notification_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.compliance_set_updated_at();

create table if not exists public.compliance_change_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.compliance_profiles(id) on delete set null,
  change_id uuid not null references public.compliance_regulatory_changes(id) on delete cascade,
  alert_id uuid references public.compliance_alerts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','in_review','assessed','dismissed')),
  applicability_status text check (applicability_status is null or applicability_status in ('review','applicable','partially_applicable','not_applicable','out_of_scope')),
  owner_name text,
  notes text,
  due_on date,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists compliance_change_reviews_user_change_profile_uq
  on public.compliance_change_reviews(user_id, change_id, coalesce(profile_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists compliance_change_reviews_user_status_idx on public.compliance_change_reviews(user_id, status, created_at desc);
create index if not exists compliance_change_reviews_change_fk_idx on public.compliance_change_reviews(change_id);
create index if not exists compliance_change_reviews_profile_fk_idx on public.compliance_change_reviews(profile_id);
create index if not exists compliance_change_reviews_alert_fk_idx on public.compliance_change_reviews(alert_id);

alter table public.compliance_change_reviews enable row level security;
revoke all on table public.compliance_change_reviews from anon, authenticated;
grant select, update, delete on table public.compliance_change_reviews to authenticated;
grant all on table public.compliance_change_reviews to service_role;

drop policy if exists compliance_change_reviews_select_own on public.compliance_change_reviews;
create policy compliance_change_reviews_select_own on public.compliance_change_reviews for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists compliance_change_reviews_update_own on public.compliance_change_reviews;
create policy compliance_change_reviews_update_own on public.compliance_change_reviews for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.compliance_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  )
);
drop policy if exists compliance_change_reviews_delete_own on public.compliance_change_reviews;
create policy compliance_change_reviews_delete_own on public.compliance_change_reviews for delete to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists compliance_change_reviews_set_updated_at on public.compliance_change_reviews;
create trigger compliance_change_reviews_set_updated_at
before update on public.compliance_change_reviews
for each row execute function public.compliance_set_updated_at();

create or replace function public.compliance_severity_rank(p_severity text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_severity
    when 'critical' then 4
    when 'high' then 3
    when 'medium' then 2
    when 'low' then 1
    else 0
  end;
$$;

create or replace function public.notification_severity_rank(p_severity text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_severity
    when 'critical' then 2
    when 'warning' then 1
    else 0
  end;
$$;

create or replace function public.compliance_queue_regulatory_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg record;
  v_alert record;
  v_review_id uuid;
  v_notification_severity text;
  v_pref_in_app boolean;
  v_pref_min_severity text;
  v_pref_muted text[];
  v_notification_inserted boolean;
begin
  select r.id as regulation_id,
         r.title,
         r.jurisdiction,
         r.domains,
         s.regulator
    into v_reg
    from public.compliance_regulations r
    join public.compliance_regulatory_sources s on s.id = r.source_id
   where r.id = new.regulation_id;

  if v_reg.regulation_id is null then
    return new;
  end if;

  v_notification_severity := case
    when new.severity = 'critical' then 'critical'
    when new.severity in ('high','medium') then 'warning'
    else 'info'
  end;

  for v_alert in
    select a.*
      from public.compliance_alerts a
     where a.active = true
       and (coalesce(cardinality(a.jurisdictions), 0) = 0 or v_reg.jurisdiction = any(a.jurisdictions))
       and (coalesce(cardinality(a.regulators), 0) = 0 or v_reg.regulator = any(a.regulators))
       and (coalesce(cardinality(a.domains), 0) = 0 or a.domains && coalesce(v_reg.domains, '{}'::text[]))
       and public.compliance_severity_rank(new.severity) >= public.compliance_severity_rank(a.minimum_severity)
  loop
    insert into public.compliance_change_reviews (
      user_id, profile_id, change_id, alert_id, status, metadata
    ) values (
      v_alert.user_id,
      v_alert.profile_id,
      new.id,
      v_alert.id,
      'pending',
      jsonb_build_object(
        'regulation_id', v_reg.regulation_id,
        'jurisdiction', v_reg.jurisdiction,
        'regulator', v_reg.regulator,
        'change_severity', new.severity
      )
    )
    on conflict do nothing
    returning id into v_review_id;

    if v_review_id is null then
      select cr.id into v_review_id
        from public.compliance_change_reviews cr
       where cr.user_id = v_alert.user_id
         and cr.change_id = new.id
         and cr.profile_id is not distinct from v_alert.profile_id
       limit 1;
    end if;

    if not ('in_app' = any(coalesce(v_alert.channels, array['in_app']::text[]))) then
      continue;
    end if;

    select coalesce(np.in_app, true),
           coalesce(np.min_severity, 'info'),
           coalesce(np.muted_types, '{}'::text[])
      into v_pref_in_app, v_pref_min_severity, v_pref_muted
      from public.notification_preferences np
     where np.user_id = v_alert.user_id;

    if not found then
      v_pref_in_app := true;
      v_pref_min_severity := 'info';
      v_pref_muted := '{}'::text[];
    end if;

    if not v_pref_in_app
       or 'compliance.regulatory_change_detected' = any(v_pref_muted)
       or public.notification_severity_rank(v_notification_severity) < public.notification_severity_rank(v_pref_min_severity)
    then
      continue;
    end if;

    v_notification_inserted := false;
    insert into public.notifications (
      user_id, kind, severity, title, body, link, metadata
    ) values (
      v_alert.user_id,
      'compliance.regulatory_change_detected',
      v_notification_severity,
      left('Regulatory change requires review: ' || v_reg.title, 200),
      left(coalesce(new.summary, 'An authoritative regulatory source changed and requires review.'), 500),
      '/compliance-sentinel',
      jsonb_build_object(
        'compliance_change_id', new.id,
        'compliance_review_id', v_review_id,
        'regulation_id', v_reg.regulation_id,
        'alert_id', v_alert.id,
        'jurisdiction', v_reg.jurisdiction,
        'regulator', v_reg.regulator,
        'change_severity', new.severity
      )
    )
    on conflict do nothing;

    get diagnostics v_notification_inserted = row_count;
    if v_notification_inserted then
      update public.compliance_alerts
         set last_notified_at = now()
       where id = v_alert.id;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.compliance_queue_regulatory_change() from public, anon, authenticated;
grant execute on function public.compliance_queue_regulatory_change() to service_role;

drop trigger if exists compliance_regulatory_changes_queue_review on public.compliance_regulatory_changes;
create trigger compliance_regulatory_changes_queue_review
after insert on public.compliance_regulatory_changes
for each row execute function public.compliance_queue_regulatory_change();
