
-- 1. Catalog images: explicit prefix instead of "not photos"
DROP POLICY IF EXISTS "Authenticated users can read catalog images" ON storage.objects;
CREATE POLICY "Authenticated users can read catalog images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'plant-images'
  AND (storage.foldername(name))[1] = 'catalog'
);

-- Non-admin uploads must stay under photos/<uid>/ (already enforced); make admin-only writes
-- outside that prefix explicit by keeping admin policies as the only other write path.

-- 2. Orders: writes are server-side (service role) only
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_orders FROM anon;
GRANT ALL ON public.marketplace_orders TO service_role;

-- 3. Marketplace-safe seller profile lookup (no email / phone / coordinates,
--    avatar only when the seller opted in)
CREATE OR REPLACE FUNCTION public.marketplace_sellers_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, country_code text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id,
         p.username,
         p.display_name,
         CASE WHEN COALESCE(p.marketplace_show_avatar, false) THEN p.avatar_url ELSE NULL END,
         p.country_code,
         p.created_at
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.marketplace_sellers_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_sellers_by_ids(uuid[]) TO authenticated, service_role;
