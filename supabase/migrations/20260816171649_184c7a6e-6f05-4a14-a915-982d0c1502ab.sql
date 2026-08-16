ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feed_last_seen_at timestamp with time zone;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;