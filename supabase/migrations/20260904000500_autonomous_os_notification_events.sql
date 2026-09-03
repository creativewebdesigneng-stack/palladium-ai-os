alter table public.autonomous_goals
  add column if not exists event_source text,
  add column if not exists event_match text,
  add column if not exists pending_event_context jsonb not null default '{}'::jsonb;

update public.autonomous_goals
set event_source = 'notification'
where trigger_type = 'event' and event_source is null;

create or replace function public.trigger_autonomous_goals_from_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.kind, '') = 'autonomous_os' then
    return new;
  end if;

  update public.autonomous_goals g
  set
    next_run_at = now(),
    pending_event_context = jsonb_build_object(
      'source', 'notification',
      'notification_id', new.id,
      'kind', new.kind,
      'severity', new.severity,
      'title', new.title,
      'body', new.body,
      'created_at', new.created_at
    ),
    updated_at = now()
  where g.user_id = new.user_id
    and g.status = 'active'
    and g.trigger_type = 'event'
    and coalesce(g.event_source, 'notification') = 'notification'
    and (
      nullif(trim(g.event_match), '') is null
      or coalesce(new.title, '') ilike '%' || g.event_match || '%'
      or coalesce(new.body, '') ilike '%' || g.event_match || '%'
      or coalesce(new.kind, '') ilike '%' || g.event_match || '%'
    );

  return new;
end;
$$;

drop trigger if exists autonomous_goal_notification_event on public.notifications;
create trigger autonomous_goal_notification_event
after insert on public.notifications
for each row execute function public.trigger_autonomous_goals_from_notification();
