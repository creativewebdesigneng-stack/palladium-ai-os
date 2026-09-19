-- pg_cron alter_job can replace an omitted schedule with its default.
-- Pin Blackstar's intended cadences while keeping the repaired workers paused.

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='blackstar-workflow-runner' limit 1;
  if v_job_id is not null then
    perform cron.alter_job(v_job_id, schedule := '*/5 * * * *', active := false);
  end if;

  select jobid into v_job_id from cron.job where jobname='blackstar-webhook-retries' limit 1;
  if v_job_id is not null then
    perform cron.alter_job(v_job_id, schedule := '*/5 * * * *', active := false);
  end if;

  select jobid into v_job_id from cron.job where jobname='blackstar-dropshipping-opportunity-monitor' limit 1;
  if v_job_id is not null then
    perform cron.alter_job(v_job_id, schedule := '7,37 * * * *', active := false);
  end if;
end;
$$;
