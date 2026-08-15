DROP POLICY IF EXISTS "Authenticated users can read catalog images" ON storage.objects;

CREATE POLICY "Authenticated users can read catalog images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'plant-images'
  AND coalesce((storage.foldername(name))[1], '') <> 'photos'
);