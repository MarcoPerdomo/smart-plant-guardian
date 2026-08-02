CREATE POLICY "Users update own plant snapshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'plant-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'plant-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);