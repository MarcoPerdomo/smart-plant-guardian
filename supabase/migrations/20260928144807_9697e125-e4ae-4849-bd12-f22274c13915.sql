DROP POLICY IF EXISTS "Authenticated read weather cache" ON public.weather_cache;

DROP POLICY IF EXISTS "settings readable" ON public.marketplace_settings;
CREATE POLICY "Admins read marketplace settings" ON public.marketplace_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated read catalog" ON public.plant_species;
CREATE POLICY "Authenticated read active catalog" ON public.plant_species
  FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read catalog images" ON storage.objects;
CREATE POLICY "Authenticated users can read catalog images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'plant-images'
    AND (storage.foldername(name))[1] = 'catalog'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.plant_species s
        WHERE s.archived_at IS NULL
          AND s.image_url LIKE '%/plant-images/' || storage.objects.name || '%'
      )
    )
  );