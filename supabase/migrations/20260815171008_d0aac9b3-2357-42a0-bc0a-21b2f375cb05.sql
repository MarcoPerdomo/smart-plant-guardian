-- 1. Soft delete columns
ALTER TABLE public.user_plants
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

ALTER TABLE public.plant_species
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

CREATE INDEX IF NOT EXISTS user_plants_archived_at_idx ON public.user_plants (archived_at);
CREATE INDEX IF NOT EXISTS plant_species_archived_at_idx ON public.plant_species (archived_at);

-- 2. Archive table
CREATE TABLE IF NOT EXISTS public.archived_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  owner_id uuid,
  snapshot jsonb NOT NULL,
  reason text,
  archived_by uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  restored_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.archived_records TO authenticated;
GRANT ALL ON public.archived_records TO service_role;

ALTER TABLE public.archived_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read archive" ON public.archived_records
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write archive" ON public.archived_records
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND archived_by = auth.uid());
CREATE POLICY "Admins update archive" ON public.archived_records
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS archived_records_set_updated_at ON public.archived_records;
CREATE TRIGGER archived_records_set_updated_at
  BEFORE UPDATE ON public.archived_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS archived_records_entity_idx ON public.archived_records (entity_type, entity_id);

-- 3. Admin visibility / management policies
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all plants" ON public.user_plants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins archive plants" ON public.user_plants
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Role management (roles stay in user_roles only)
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins grant roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins revoke roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

GRANT INSERT, DELETE ON public.user_roles TO authenticated;