DROP POLICY IF EXISTS "No client writes to ai summaries" ON public.ai_summaries;

CREATE POLICY "No client inserts to ai summaries"
  ON public.ai_summaries AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No client updates to ai summaries"
  ON public.ai_summaries AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No client deletes to ai summaries"
  ON public.ai_summaries AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "No client writes to weather alerts" ON public.plant_weather_alerts;

CREATE POLICY "No client inserts to weather alerts"
  ON public.plant_weather_alerts AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No client updates to weather alerts"
  ON public.plant_weather_alerts AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No client deletes to weather alerts"
  ON public.plant_weather_alerts AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

GRANT SELECT ON public.ai_summaries TO authenticated;
GRANT ALL ON public.ai_summaries TO service_role;
GRANT SELECT ON public.plant_weather_alerts TO authenticated;
GRANT ALL ON public.plant_weather_alerts TO service_role;