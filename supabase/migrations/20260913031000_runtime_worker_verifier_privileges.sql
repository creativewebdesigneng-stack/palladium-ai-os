-- Remove Supabase default function grants that are broader than the worker transport needs.

revoke all on function public.verify_runtime_worker_token(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.verify_runtime_worker_token(text, text) to anon, service_role;
