REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.sensor_readings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_summaries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.notifications FROM anon;
GRANT SELECT ON public.sensor_readings TO authenticated;
GRANT SELECT ON public.ai_summaries TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;
GRANT ALL ON public.ai_summaries TO service_role;

CREATE POLICY "No client writes to sensor readings" ON public.sensor_readings AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client writes to ai summaries" ON public.ai_summaries AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);