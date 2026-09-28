REVOKE ALL ON FUNCTION public.sync_plant_last_watered() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_on_plant_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_plant_last_watered() TO service_role;
GRANT EXECUTE ON FUNCTION public.post_on_plant_event() TO service_role;