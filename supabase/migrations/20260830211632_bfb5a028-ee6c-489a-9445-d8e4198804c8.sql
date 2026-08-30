ALTER TABLE public.plant_species
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS environment_notes text;

ALTER TABLE public.plant_species
  ADD CONSTRAINT plant_species_environment_check
  CHECK (environment IN ('indoor','outdoor','both','unknown'));

ALTER TABLE public.user_plants
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'indoor';

ALTER TABLE public.user_plants
  ADD CONSTRAINT user_plants_environment_check
  CHECK (environment IN ('indoor','outdoor'));

UPDATE public.user_plants SET environment = 'indoor';