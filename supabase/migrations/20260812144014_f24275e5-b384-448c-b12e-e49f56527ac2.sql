drop policy if exists "mr_read" on public.marketplace_reviews;
create policy "mr_read" on public.marketplace_reviews
  for select to authenticated using (true);
revoke select on public.marketplace_reviews from anon;