DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE FUNCTION public.profiles_public_by_ids(_ids uuid[])
RETURNS TABLE (id uuid, username text, display_name text, avatar_url text, bio text, country_code text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio, p.country_code, p.created_at
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
$$;

CREATE OR REPLACE FUNCTION public.search_profiles(_q text, _limit integer DEFAULT 20)
RETURNS TABLE (id uuid, username text, display_name text, avatar_url text, bio text, country_code text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio, p.country_code, p.created_at
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND p.id <> auth.uid()
    AND NOT public.is_blocked(p.id, auth.uid())
    AND (
      length(coalesce(_q, '')) > 0
      AND (lower(p.username) LIKE '%' || lower(_q) || '%' OR lower(coalesce(p.display_name, '')) LIKE '%' || lower(_q) || '%')
    )
  ORDER BY p.username
  LIMIT least(coalesce(_limit, 20), 50)
$$;

CREATE OR REPLACE FUNCTION public.get_profile_by_username(_username text)
RETURNS TABLE (id uuid, username text, display_name text, avatar_url text, bio text, country_code text, created_at timestamptz, plant_count integer, friend_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio, p.country_code, p.created_at,
         public.user_plant_count(p.id), public.user_friend_count(p.id)
  FROM public.profiles p
  WHERE lower(p.username) = lower(_username)
    AND NOT public.is_blocked(p.id, auth.uid())
$$;

REVOKE ALL ON FUNCTION public.profiles_public_by_ids(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_profiles(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_profile_by_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profiles_public_by_ids(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_by_username(text) TO authenticated, service_role;

-- Trigger-only functions must not be callable through the API
REVOKE ALL ON FUNCTION public.post_on_watering() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_on_photo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_on_new_plant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_friendship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_reaction() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
