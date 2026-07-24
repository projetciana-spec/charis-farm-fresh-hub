
CREATE POLICY "public read farm-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'farm-images');
CREATE POLICY "admin insert farm-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'farm-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update farm-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'farm-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete farm-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'farm-images' AND public.has_role(auth.uid(),'admin'));
