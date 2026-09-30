ALTER TABLE public.user_plants
ADD COLUMN sensor_enabled boolean NOT NULL DEFAULT false;

UPDATE public.user_plants
SET sensor_enabled = true;

COMMENT ON COLUMN public.user_plants.sensor_enabled IS 'Controls whether the optional Sensor journal is shown for this plant.';