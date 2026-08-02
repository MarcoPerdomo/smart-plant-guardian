-- Catalog image bucket policies
CREATE POLICY "Authenticated users can read catalog images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'plant-images');

CREATE POLICY "Service role can manage catalog images"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'plant-images')
WITH CHECK (bucket_id = 'plant-images');
