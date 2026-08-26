DROP POLICY IF EXISTS "No client writes to sensor readings" ON public.sensor_readings;

CREATE POLICY "No client inserts to sensor readings"
  ON public.sensor_readings
  AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client updates to sensor readings"
  ON public.sensor_readings
  AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (false);

CREATE POLICY "No client deletes to sensor readings"
  ON public.sensor_readings
  AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (false);

GRANT SELECT ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;