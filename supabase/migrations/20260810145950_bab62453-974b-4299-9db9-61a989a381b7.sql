ALTER TABLE public.agent_activities REPLICA IDENTITY FULL;
ALTER TABLE public.personal_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.approval_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;