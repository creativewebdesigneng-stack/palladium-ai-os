create or replace function public.enforce_marketplace_listing_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for trusted server-side (service_role) contexts.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'draft'::listing_status then
      raise exception 'New listings must start as a draft';
    end if;
    if coalesce(new.install_count, 0) <> 0
       or coalesce(new.rating_count, 0) <> 0
       or coalesce(new.rating_avg, 0) <> 0
       or new.published_at is not null
       or new.review_notes is not null then
      raise exception 'Listing review and popularity fields are set by the platform';
    end if;
    return new;
  end if;

  if new.publisher_id is distinct from old.publisher_id then
    raise exception 'Changing a listing publisher is not permitted';
  end if;
  if new.install_count is distinct from old.install_count
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.published_at is distinct from old.published_at then
    raise exception 'Listing popularity and publication fields are set by the platform';
  end if;
  if new.review_notes is distinct from old.review_notes and new.review_notes is not null then
    raise exception 'Listing review notes are set by the platform';
  end if;

  if new.status is distinct from old.status then
    if not (
      (new.status = 'pending_review'::listing_status
        and old.status in ('draft'::listing_status, 'rejected'::listing_status))
      or new.status = 'unlisted'::listing_status
      or (new.status = 'draft'::listing_status and old.status = 'unlisted'::listing_status)
    ) then
      raise exception 'Listing status transition requires platform review';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists marketplace_agents_listing_integrity on public.marketplace_agents;
create trigger marketplace_agents_listing_integrity
before insert or update on public.marketplace_agents
for each row execute function public.enforce_marketplace_listing_integrity();

create or replace function public.enforce_builder_production_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare approved boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Changing a deployment owner is not permitted';
  end if;

  if new.production_status is distinct from old.production_status then
    if not (
      (old.production_status = 'not_started' and new.production_status = 'approval_pending')
      or (old.production_status = 'approval_pending' and new.production_status in ('approved', 'failed'))
      or (old.production_status = 'approved' and new.production_status in ('promoting', 'failed'))
      or (old.production_status = 'promoting' and new.production_status in ('promoted', 'failed'))
    ) then
      raise exception 'Invalid production publish transition';
    end if;

    if new.production_status in ('approved', 'promoting', 'promoted') then
      select exists (
        select 1 from public.approval_requests r
        where r.id = new.production_approval_id
          and r.user_id = new.user_id
          and r.status = 'approved'
          and r.action_type = 'vercel_production_promote'
      ) into approved;
      if not approved then
        raise exception 'Production promotion requires an approved publish request';
      end if;
    end if;
  end if;

  if (new.production_promoted_at is distinct from old.production_promoted_at
      or new.production_aliases is distinct from old.production_aliases)
     and new.production_status is distinct from 'promoted' then
    raise exception 'Production promotion details are only recorded on a promoted deployment';
  end if;

  return new;
end $$;

drop trigger if exists builder_deployments_production_promotion on public.builder_deployments;
create trigger builder_deployments_production_promotion
before update on public.builder_deployments
for each row execute function public.enforce_builder_production_promotion();