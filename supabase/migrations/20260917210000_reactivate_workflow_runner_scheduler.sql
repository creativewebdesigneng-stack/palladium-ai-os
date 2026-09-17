do $$
declare
  workflow_runner_job_id bigint;
begin
  select jobid
    into workflow_runner_job_id
    from cron.job
   where jobname = 'blackstar-workflow-runner'
   limit 1;

  if workflow_runner_job_id is null then
    raise exception 'blackstar-workflow-runner cron job is missing';
  end if;

  perform cron.alter_job(workflow_runner_job_id, active := true);
end;
$$;
