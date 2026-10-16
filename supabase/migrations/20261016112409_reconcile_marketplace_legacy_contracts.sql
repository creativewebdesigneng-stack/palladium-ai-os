-- Preserve the canonical marketplace; protect server/payment/moderation authority.
-- Explicit trusted database roles cover the existing service and governed RPCs;
-- a missing auth.uid() never grants authority.
create function private.guard_marketplace_listing_authority() returns trigger language plpgsql security invoker set search_path='' as $$
declare trusted boolean:=current_user in ('service_role','postgres','supabase_admin'); moderator boolean;
begin
 select exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid())) into moderator;
 if not trusted then
  if tg_op='INSERT' then
   if new.status<>'draft' or new.listing_fee_pence<>300 or new.listing_fee_paid_at is not null or new.published_at is not null then raise exception 'New marketplace listings must be unpaid drafts';end if;
  else
   if new.id is distinct from old.id or new.seller_id is distinct from old.seller_id or new.listing_fee_pence is distinct from old.listing_fee_pence or new.listing_fee_paid_at is distinct from old.listing_fee_paid_at or new.created_at is distinct from old.created_at then raise exception 'Marketplace identity and payment evidence are server-owned';end if;
   if new.published_at is distinct from old.published_at and not moderator then raise exception 'Publication evidence requires marketplace moderation';end if;
   if old.status='published' and (to_jsonb(new)-array['status','updated_at']) is distinct from (to_jsonb(old)-array['status','updated_at']) then raise exception 'Unlist a published listing before changing its contents';end if;
   if new.status='published' and old.status<>'published' and not moderator then raise exception 'Marketplace publication requires administrator moderation';end if;
  end if;
 end if;
 if new.status='published' and (tg_op='INSERT' or old.status<>'published') then
  if new.listing_fee_paid_at is null or not exists(select 1 from public.marketplace_moderation_cases m where m.listing_id=new.id and m.seller_id=new.seller_id and m.status='approved') then raise exception 'Publication requires paid listing fee and approved moderation';end if;
 end if;
 if not trusted and new.status='pending_review' and (tg_op='INSERT' or old.status<>'pending_review') then raise exception 'Submit review through the audited publication workflow';end if;
 return new;
end $$;
create trigger marketplace_listing_authority before insert or update on public.marketplace_listings for each row execute function private.guard_marketplace_listing_authority();

create function private.guard_marketplace_seller_authority() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user not in ('service_role','postgres','supabase_admin') then
  if tg_op='INSERT' then
   if new.verification_status<>'unverified' or new.sales_count<>0 or new.rating_count<>0 or new.rating_average is not null or new.stripe_connected_account_id is not null or new.stripe_onboarding_complete or new.stripe_charges_enabled or new.stripe_payouts_enabled then raise exception 'Seller verification, metrics and payment connections are server-owned';end if;
  elsif (to_jsonb(new)-array['display_name','handle','bio','website_url','avatar_url','banner_url','updated_at']) is distinct from (to_jsonb(old)-array['display_name','handle','bio','website_url','avatar_url','banner_url','updated_at']) then raise exception 'Seller identity, verification, metrics and payment connections are server-owned';end if;
 end if;
 return new;
end $$;
create trigger marketplace_seller_authority before insert or update on public.marketplace_seller_profiles for each row execute function private.guard_marketplace_seller_authority();

create function private.guard_marketplace_review_identity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.order_id is distinct from old.order_id or new.listing_id is distinct from old.listing_id or new.seller_id is distinct from old.seller_id or new.buyer_id is distinct from old.buyer_id or new.id is distinct from old.id) then raise exception 'Review purchase identity is immutable';end if;
 if not exists(select 1 from public.marketplace_orders o where o.id=new.order_id and o.listing_id=new.listing_id and o.seller_id=new.seller_id and o.buyer_id=new.buyer_id and o.status in ('paid','fulfilled')) then raise exception 'Review requires the exact paid purchase';end if;
 return new;
end $$;
create trigger marketplace_review_identity before insert or update on public.marketplace_reviews for each row execute function private.guard_marketplace_review_identity();
revoke all on function private.guard_marketplace_listing_authority(),private.guard_marketplace_seller_authority(),private.guard_marketplace_review_identity() from public,anon,authenticated;
grant execute on function private.guard_marketplace_listing_authority(),private.guard_marketplace_seller_authority(),private.guard_marketplace_review_identity() to service_role;

-- The existing allowlist is authoritative, including reads needed to review others' drafts.
create policy marketplace_listings_moderator_read on public.marketplace_listings for select to authenticated using(exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid())));
create policy marketplace_listings_moderator_update on public.marketplace_listings for update to authenticated using(exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid()))) with check(exists(select 1 from public.marketplace_admins a where a.user_id=(select auth.uid())));

create function public.request_marketplace_publication(p_user_id uuid,p_listing_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.marketplace_listings;
begin
 select * into l from public.marketplace_listings where id=p_listing_id and seller_id=p_user_id for update;
 if not found or l.status not in ('draft','rejected','unlisted') then raise exception 'Only owned draft, rejected or unlisted listings can be submitted';end if;
 if l.listing_fee_paid_at is null then
  update public.marketplace_listings set status='listing_fee_due',updated_at=now() where id=l.id returning * into l;
  return jsonb_build_object('listing',to_jsonb(l),'next','listing_fee_payment_required','amount_pence',300);
 end if;
 insert into public.marketplace_moderation_cases(listing_id,seller_id,status) values(l.id,l.seller_id,'pending');
 update public.marketplace_listings set status='pending_review',updated_at=now() where id=l.id returning * into l;
 return jsonb_build_object('listing',to_jsonb(l),'next','moderation');
end $$;
create function public.decide_marketplace_moderation(p_actor_id uuid,p_case_id uuid,p_decision text,p_notes text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.marketplace_moderation_cases; l public.marketplace_listings; next_status text;
begin
 if not exists(select 1 from public.marketplace_admins where user_id=p_actor_id) then raise exception 'Marketplace administrator access required';end if;
 if p_decision is null or p_decision not in ('approved','rejected','needs_changes') then raise exception 'Invalid moderation decision';end if;
 select * into m from public.marketplace_moderation_cases where id=p_case_id and status='pending' for update;
 if not found then raise exception 'Pending moderation case not found';end if;
 select * into l from public.marketplace_listings where id=m.listing_id and seller_id=m.seller_id and status='pending_review' for update;
 if not found or l.listing_fee_paid_at is null then raise exception 'Moderation requires the matching paid pending listing';end if;
 update public.marketplace_moderation_cases set status=p_decision,notes=p_notes,reviewed_by=p_actor_id,reviewed_at=now() where id=m.id;
 next_status:=case when p_decision='approved' then 'published' else 'rejected' end;
 update public.marketplace_listings set status=next_status,published_at=case when next_status='published' then now() else published_at end,updated_at=now() where id=l.id;
 return jsonb_build_object('ok',true,'status',next_status);
end $$;
revoke all on function public.request_marketplace_publication(uuid,uuid),public.decide_marketplace_moderation(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.request_marketplace_publication(uuid,uuid),public.decide_marketplace_moderation(uuid,uuid,text,text) to service_role;
