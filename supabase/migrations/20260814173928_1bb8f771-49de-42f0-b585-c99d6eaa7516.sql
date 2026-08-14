CREATE TABLE public.plant_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  caption text,
  width integer,
  height integer,
  bytes integer,
  content_type text,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plant_photos_plant_taken_idx ON public.plant_photos (plant_id, taken_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_photos TO authenticated;
GRANT ALL ON public.plant_photos TO service_role;

ALTER TABLE public.plant_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plant photos" ON public.plant_photos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plant photos" ON public.plant_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = plant_id AND p.user_id = auth.uid()));
CREATE POLICY "Users update own plant photos" ON public.plant_photos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own plant photos" ON public.plant_photos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER plant_photos_set_updated_at BEFORE UPDATE ON public.plant_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage: owner-scoped access to photos/{user_id}/... in plant-images
CREATE POLICY "Users upload own plant photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plant-images' AND (storage.foldername(name))[1] = 'photos' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Users read own plant photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'plant-images' AND (storage.foldername(name))[1] = 'photos' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Users delete own plant photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'plant-images' AND (storage.foldername(name))[1] = 'photos' AND (storage.foldername(name))[2] = auth.uid()::text);