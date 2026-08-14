CREATE SCHEMA IF NOT EXISTS extensions;
DROP INDEX IF EXISTS public.plant_species_search_text_trgm;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
CREATE INDEX IF NOT EXISTS plant_species_search_text_trgm
  ON public.plant_species USING gin (search_text extensions.gin_trgm_ops);