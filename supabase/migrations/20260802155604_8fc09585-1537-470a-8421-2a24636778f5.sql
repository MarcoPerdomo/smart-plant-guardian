ALTER TABLE public.sensor_readings ADD COLUMN snapshot_url text;

-- Allow authenticated users to view snapshots stored in their own user folder.
CREATE POLICY "Users can view own plant snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'plant-snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload snapshots to their own user folder (future manual uploads).
CREATE POLICY "Users can upload own plant snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'plant-snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete snapshots in their own user folder.
CREATE POLICY "Users can delete own plant snapshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'plant-snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);