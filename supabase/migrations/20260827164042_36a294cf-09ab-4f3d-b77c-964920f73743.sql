ALTER TABLE public.sensor_readings ALTER COLUMN user_email SET DEFAULT lower(auth.jwt() ->> 'email');
ALTER TABLE public.watering_events ALTER COLUMN user_email SET DEFAULT lower(auth.jwt() ->> 'email');
ALTER TABLE public.ai_summaries ALTER COLUMN user_email SET DEFAULT lower(auth.jwt() ->> 'email');
ALTER TABLE public.plant_weather_alerts ALTER COLUMN user_email SET DEFAULT lower(auth.jwt() ->> 'email');