-- Cover the Cinema render evidence -> canonical media job foreign key reported by
-- the production Supabase performance advisor after persistence reconciliation.
create index if not exists cinema_shot_renders_media_job_idx
  on public.cinema_shot_renders(media_job_id)
  where media_job_id is not null;
