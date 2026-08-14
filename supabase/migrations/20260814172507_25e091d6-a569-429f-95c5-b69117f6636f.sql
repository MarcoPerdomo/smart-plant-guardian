CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

ALTER TABLE public.plant_species ADD COLUMN IF NOT EXISTS search_text text;

CREATE OR REPLACE FUNCTION public.plant_species_set_search_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_text := lower(
    coalesce(NEW.common_name, '') || ' ' ||
    coalesce(NEW.scientific_name, '') || ' ' ||
    coalesce(array_to_string(NEW.aliases, ' '), '')
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.plant_species_set_search_text() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS plant_species_search_text ON public.plant_species;
CREATE TRIGGER plant_species_search_text
BEFORE INSERT OR UPDATE ON public.plant_species
FOR EACH ROW EXECUTE FUNCTION public.plant_species_set_search_text();

UPDATE public.plant_species SET search_text = lower(
  coalesce(common_name, '') || ' ' ||
  coalesce(scientific_name, '') || ' ' ||
  coalesce(array_to_string(aliases, ' '), '')
);

CREATE INDEX IF NOT EXISTS plant_species_search_text_trgm
  ON public.plant_species USING gin (search_text public.gin_trgm_ops);