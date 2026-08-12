CREATE TABLE public.memory_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_capture boolean NOT NULL DEFAULT true,
  capture_sensitive boolean NOT NULL DEFAULT false,
  short_term_enabled boolean NOT NULL DEFAULT true,
  long_term_enabled boolean NOT NULL DEFAULT true,
  document_memory_enabled boolean NOT NULL DEFAULT true,
  organisation_sharing_enabled boolean NOT NULL DEFAULT false,
  short_term_ttl_minutes integer NOT NULL DEFAULT 720,
  retention_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_preferences TO authenticated;
GRANT ALL ON public.memory_preferences TO service_role;

ALTER TABLE public.memory_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_preferences_own" ON public.memory_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER memory_preferences_updated_at BEFORE UPDATE ON public.memory_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Private document store: every object lives under <user_id>/... and is only
-- reachable by its owner. No public read policy exists by design.
CREATE POLICY "knowledge_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "knowledge_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "knowledge_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "knowledge_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = auth.uid()::text);