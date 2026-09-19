-- Route Blackstar's Vercel-backed schedulers through the narrowly scoped
-- Supabase runtime-worker-dispatch relay. Keep every affected job paused until
-- an authenticated post-deploy probe succeeds; activation is an operational step.

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'blackstar-workflow-runner'
   limit 1;

  if v_job_id is not null then
    perform cron.alter_job(
      v_job_id,
      command := $workflow$
        select net.http_post(
          url := 'https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/runtime-worker-dispatch?worker=workflow_runner&limit=4',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              select decrypted_secret
                from vault.decrypted_secrets
               where name = 'blackstar_workflow_runner_token'
               limit 1
            )
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 55000
        ) as request_id;
      $workflow$,
      active := false
    );
  end if;

  select jobid into v_job_id
    from cron.job
   where jobname = 'blackstar-webhook-retries'
   limit 1;

  if v_job_id is not null then
    perform cron.alter_job(
      v_job_id,
      command := $webhook$
        select net.http_post(
          url := 'https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/runtime-worker-dispatch?worker=webhook_retry&limit=50',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              select decrypted_secret
                from vault.decrypted_secrets
               where name = 'blackstar_webhook_retry_token'
               limit 1
            )
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        ) as request_id;
      $webhook$,
      active := false
    );
  end if;

  select jobid into v_job_id
    from cron.job
   where jobname = 'blackstar-dropshipping-opportunity-monitor'
   limit 1;

  if v_job_id is not null then
    perform cron.alter_job(
      v_job_id,
      command := $dropshipping$
        select net.http_post(
          url := 'https://piwhiuangitqvwvwwcga.supabase.co/functions/v1/runtime-worker-dispatch?worker=dropshipping_monitor&limit=4',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              select decrypted_secret
                from vault.decrypted_secrets
               where name = 'blackstar_dropshipping_monitor_token'
               limit 1
            )
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 55000
        ) as request_id;
      $dropshipping$,
      active := false
    );
  end if;
end;
$$;
