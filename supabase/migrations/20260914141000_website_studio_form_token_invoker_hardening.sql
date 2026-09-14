alter function public.website_studio_stage_form_deployment_token(uuid, text, text, text)
  security invoker;

alter function public.website_studio_promote_form_deployment_token(uuid, text, text, text)
  security invoker;

revoke all on function public.website_studio_stage_form_deployment_token(uuid, text, text, text)
  from public, anon, service_role;
revoke all on function public.website_studio_promote_form_deployment_token(uuid, text, text, text)
  from public, anon, service_role;

grant execute on function public.website_studio_stage_form_deployment_token(uuid, text, text, text)
  to authenticated;
grant execute on function public.website_studio_promote_form_deployment_token(uuid, text, text, text)
  to authenticated;
