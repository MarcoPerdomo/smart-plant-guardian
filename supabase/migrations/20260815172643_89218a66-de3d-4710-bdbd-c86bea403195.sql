ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS timezone text;

CREATE TABLE IF NOT EXISTS public.weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat numeric NOT NULL,
  lon numeric NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lat, lon)
);

GRANT SELECT ON public.weather_cache TO authenticated;
GRANT ALL ON public.weather_cache TO service_role;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read weather cache" ON public.weather_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "No client writes to weather cache" ON public.weather_cache AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER weather_cache_set_updated_at BEFORE UPDATE ON public.weather_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.plant_weather_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  for_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, rule, for_date)
);

GRANT SELECT ON public.plant_weather_alerts TO authenticated;
GRANT ALL ON public.plant_weather_alerts TO service_role;
ALTER TABLE public.plant_weather_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own weather alerts" ON public.plant_weather_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "No client writes to weather alerts" ON public.plant_weather_alerts AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER plant_weather_alerts_set_updated_at BEFORE UPDATE ON public.plant_weather_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS plant_weather_alerts_user_date_idx ON public.plant_weather_alerts (user_id, for_date DESC);