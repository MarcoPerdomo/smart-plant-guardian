-- Backfill helper: resolve a user_id to the lowercased auth.users email.
CREATE OR REPLACE FUNCTION public.user_email_by_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(email) FROM auth.users WHERE id = _user_id;
$$;

-- 1. user_plants: add user_email, backfill, update policies.
ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS user_email text
  DEFAULT lower(auth.jwt() ->> 'email');

UPDATE public.user_plants
SET user_email = public.user_email_by_id(user_id)
WHERE user_email IS NULL;

DROP POLICY IF EXISTS "Users manage own plants" ON public.user_plants;
CREATE POLICY "Users manage own plants" ON public.user_plants
  FOR ALL TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(user_email) = lower(auth.jwt() ->> 'email'));

-- 2. sensor_readings: add user_email, backfill, update policies.
ALTER TABLE public.sensor_readings ADD COLUMN IF NOT EXISTS user_email text;

UPDATE public.sensor_readings sr
SET user_email = lower(u.email)
FROM public.user_plants p
JOIN auth.users u ON u.id = p.user_id
WHERE sr.plant_id = p.id AND sr.user_email IS NULL;

DROP POLICY IF EXISTS "Users read own plant readings" ON public.sensor_readings;
CREATE POLICY "Users read own plant readings" ON public.sensor_readings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_plants p
    WHERE p.id = sensor_readings.plant_id
      AND lower(p.user_email) = lower(auth.jwt() ->> 'email')
  ));

-- 3. watering_events: add user_email, backfill, update policies.
ALTER TABLE public.watering_events ADD COLUMN IF NOT EXISTS user_email text;

UPDATE public.watering_events we
SET user_email = lower(u.email)
FROM public.user_plants p
JOIN auth.users u ON u.id = p.user_id
WHERE we.plant_id = p.id AND we.user_email IS NULL;

DROP POLICY IF EXISTS "Users manage own watering" ON public.watering_events;
CREATE POLICY "Users manage own watering" ON public.watering_events
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_plants p
    WHERE p.id = watering_events.plant_id
      AND lower(p.user_email) = lower(auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_plants p
    WHERE p.id = watering_events.plant_id
      AND lower(p.user_email) = lower(auth.jwt() ->> 'email')
  ));

-- 4. ai_summaries: add user_email, backfill, update policies.
ALTER TABLE public.ai_summaries ADD COLUMN IF NOT EXISTS user_email text;

UPDATE public.ai_summaries ais
SET user_email = lower(u.email)
FROM public.user_plants p
JOIN auth.users u ON u.id = p.user_id
WHERE ais.plant_id = p.id AND ais.user_email IS NULL;

DROP POLICY IF EXISTS "Users read own summaries" ON public.ai_summaries;
CREATE POLICY "Users read own summaries" ON public.ai_summaries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_plants p
    WHERE p.id = ai_summaries.plant_id
      AND lower(p.user_email) = lower(auth.jwt() ->> 'email')
  ));

-- 5. plant_weather_alerts: add user_email, backfill, update policies.
ALTER TABLE public.plant_weather_alerts ADD COLUMN IF NOT EXISTS user_email text;

UPDATE public.plant_weather_alerts pwa
SET user_email = public.user_email_by_id(pwa.user_id)
WHERE pwa.user_email IS NULL;

DROP POLICY IF EXISTS "Users read own weather alerts" ON public.plant_weather_alerts;
CREATE POLICY "Users read own weather alerts" ON public.plant_weather_alerts
  FOR SELECT TO authenticated
  USING (lower(user_email) = lower(auth.jwt() ->> 'email'));

-- Cleanup helper.
DROP FUNCTION IF EXISTS public.user_email_by_id(uuid);
