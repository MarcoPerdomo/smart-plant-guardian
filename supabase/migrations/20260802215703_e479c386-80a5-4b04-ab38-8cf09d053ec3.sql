CREATE POLICY "Admins insert species" ON public.plant_species FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update species" ON public.plant_species FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE ON public.plant_species TO authenticated;

CREATE POLICY "Admins upload catalog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update catalog images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read catalog images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin'));