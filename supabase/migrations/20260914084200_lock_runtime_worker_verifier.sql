-- The runtime worker verifier is an internal backend primitive.
-- Keep it unavailable through the anonymous/authenticated Data API.
revoke execute on function public.verify_runtime_worker_token(text,text) from public, anon, authenticated;
grant execute on function public.verify_runtime_worker_token(text,text) to service_role;
