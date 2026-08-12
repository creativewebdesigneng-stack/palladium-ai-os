CREATE TABLE public.creator_profiles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  handle text UNIQUE,
  bio text,
  website text,
  avatar_url text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.creator_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.creator_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO service_role;

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY cp_public_read ON public.creator_profiles
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY cp_insert_own ON public.creator_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND verified = false);

CREATE POLICY cp_update_own ON public.creator_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND verified = (SELECT c.verified FROM public.creator_profiles c WHERE c.user_id = auth.uid()));

CREATE TRIGGER creator_profiles_updated_at BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();