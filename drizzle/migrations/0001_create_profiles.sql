CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  display_name text,
  headline text,
  bio text,
  location text,
  website text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_len CHECK (char_length(display_name) <= 80),
  CONSTRAINT profiles_headline_len CHECK (char_length(headline) <= 120),
  CONSTRAINT profiles_bio_len CHECK (char_length(bio) <= 500),
  CONSTRAINT profiles_location_len CHECK (char_length(location) <= 80),
  CONSTRAINT profiles_website_len CHECK (char_length(website) <= 300),
  CONSTRAINT profiles_avatar_len CHECK (char_length(avatar_url) <= 1000)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();