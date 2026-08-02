-- ============================================================================
-- Verdant — full backend migration for an external Supabase project
-- Run this once in the "Verdant" project's SQL editor.
-- Creates: tables, grants, RLS policies, functions/triggers, indexes,
--          the plant_species catalog (30 rows), and storage policies.
-- Prerequisite: create a PRIVATE storage bucket named `plant-snapshots`
--               (Dashboard -> Storage -> New bucket) BEFORE running this.
-- ============================================================================

-- ---------- shared functions ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  phone text,
  notify_in_app boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT false,
  notify_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create a profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- plant_species (catalog) ----------
CREATE TABLE IF NOT EXISTS public.plant_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name text NOT NULL,
  scientific_name text,
  slug text NOT NULL UNIQUE,
  description text,
  light text,
  water_frequency_days integer,
  soil_moisture_min integer,
  soil_moisture_max integer,
  temperature_min_c numeric,
  temperature_max_c numeric,
  humidity_min integer,
  humidity_max integer,
  soil text,
  fertilizer text,
  toxicity text,
  common_pests text[],
  common_diseases text[],
  care_tips text,
  image_url text,
  source text NOT NULL DEFAULT 'seed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plant_species_common_name_idx ON public.plant_species (lower(common_name));
GRANT SELECT ON public.plant_species TO authenticated;
GRANT ALL ON public.plant_species TO service_role;
ALTER TABLE public.plant_species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read catalog" ON public.plant_species FOR SELECT TO authenticated USING (true);

-- ---------- user_plants ----------
CREATE TABLE IF NOT EXISTS public.user_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id uuid REFERENCES public.plant_species(id) ON DELETE SET NULL,
  nickname text NOT NULL,
  location text,
  notes text,
  image_url text,
  device_id text,
  last_watered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_plants_user_id_idx ON public.user_plants (user_id);
CREATE INDEX IF NOT EXISTS user_plants_device_id_idx ON public.user_plants (device_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plants TO authenticated;
GRANT ALL ON public.user_plants TO service_role;
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plants" ON public.user_plants FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_plants_set_updated_at BEFORE UPDATE ON public.user_plants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- sensor_readings ----------
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  soil_moisture numeric,
  temperature_c numeric,
  humidity numeric,
  light_lux numeric,
  motion_events integer,
  extra jsonb,
  source_device text,
  snapshot_url text
);
CREATE INDEX IF NOT EXISTS sensor_readings_plant_time_idx ON public.sensor_readings (plant_id, recorded_at DESC);
GRANT SELECT ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plant readings" ON public.sensor_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = sensor_readings.plant_id AND p.user_id = auth.uid()));

-- ---------- watering_events ----------
CREATE TABLE IF NOT EXISTS public.watering_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  watered_at timestamptz NOT NULL DEFAULT now(),
  amount_ml integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS watering_events_plant_time_idx ON public.watering_events (plant_id, watered_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watering_events TO authenticated;
GRANT ALL ON public.watering_events TO service_role;
ALTER TABLE public.watering_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watering" ON public.watering_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = watering_events.plant_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = watering_events.plant_id AND p.user_id = auth.uid()));

-- ---------- ai_summaries ----------
CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  summary text NOT NULL,
  recommendations jsonb
);
CREATE INDEX IF NOT EXISTS ai_summaries_plant_time_idx ON public.ai_summaries (plant_id, created_at DESC);
GRANT SELECT ON public.ai_summaries TO authenticated;
GRANT ALL ON public.ai_summaries TO service_role;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own summaries" ON public.ai_summaries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = ai_summaries.plant_id AND p.user_id = auth.uid()));

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id uuid REFERENCES public.user_plants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  body text,
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- storage policies for the `plant-snapshots` bucket ----------
-- (create the private bucket in the dashboard first)
CREATE POLICY "Users can view own plant snapshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'plant-snapshots' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own plant snapshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plant-snapshots' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own plant snapshots" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'plant-snapshots' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- ---------- catalog seed (30 species) ----------
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('African Violet','Saintpaulia','african-violet','Fuzzy leaves and bright blooms.','Bright indirect',5,45,65,18,24,50,60,'African violet mix','Bloom fertilizer bi-weekly','Non-toxic','{Mealybugs,Thrips}','{"Crown rot"}','Water from below with room-temp water.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Aloe Vera','Aloe barbadensis miller','aloe-vera','Medicinal succulent.','Bright direct',21,10,30,13,27,20,40,'Cactus / succulent mix','Cactus fertilizer quarterly','Mildly toxic to pets','{Mealybugs}','{"Root rot"}','Water deeply but infrequently.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Anthurium','Anthurium andraeanum','anthurium','Glossy heart-shaped red spathes.','Bright indirect',5,40,60,18,29,60,80,'Aroid mix','Balanced monthly','Toxic to pets','{Aphids,Thrips}','{"Root rot","Bacterial blight"}','Loves humidity. Water when top inch dry.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Areca Palm','Dypsis lutescens','areca-palm','Feathery arching fronds.','Bright indirect',5,40,60,18,29,50,70,'Well-draining potting mix','Balanced monthly','Non-toxic','{"Spider mites",Scale}','{"Tip burn"}','Use filtered water. Loves humidity.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Bird of Paradise','Strelitzia nicolai','bird-of-paradise','Large banana-like leaves.','Bright direct',7,35,60,18,29,50,70,'Well-draining loamy mix','Balanced monthly','Mildly toxic to pets','{"Spider mites",Scale}','{"Root rot"}','Give it space and lots of light.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Boston Fern','Nephrolepis exaltata','boston-fern','Feathery arching fronds.','Bright indirect',3,50,70,15,24,60,80,'Peat-based mix','Diluted balanced monthly','Non-toxic','{Scale,Mealybugs}','{"Fungal leaf spot"}','Loves humidity. Mist frequently.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Bromeliad','Guzmania lingulata','bromeliad','Bright bracts atop rosette of leaves.','Bright indirect',7,30,50,16,29,60,80,'Bromeliad / orchid mix','Diluted balanced monthly','Non-toxic','{Scale,Mealybugs}','{"Crown rot"}','Water into central cup, empty weekly.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Calathea Orbifolia','Calathea orbifolia','calathea-orbifolia','Striped round leaves that move day/night.','Medium indirect',4,50,70,18,27,60,80,'Peat-based mix','Diluted balanced monthly','Non-toxic','{"Spider mites",Thrips}','{"Leaf spot"}','Use distilled water. High humidity essential.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Chinese Evergreen','Aglaonema commutatum','chinese-evergreen','Colorful patterned leaves.','Low to medium indirect',10,30,55,18,27,40,60,'Standard potting mix','Balanced monthly','Toxic to pets','{Mealybugs,"Spider mites"}','{"Root rot"}','Tolerates low light beautifully.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Christmas Cactus','Schlumbergera bridgesii','christmas-cactus','Flowers around holidays.','Bright indirect',10,30,50,15,24,50,60,'Cactus mix + peat','Balanced monthly (bloom fert. in fall)','Non-toxic','{Mealybugs,Scale}','{"Root rot","Stem rot"}','Cool nights trigger blooms.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Croton','Codiaeum variegatum','croton','Vibrant multicolored foliage.','Bright direct',5,40,60,18,29,50,70,'Rich potting mix','Balanced monthly','Toxic to pets','{"Spider mites",Mealybugs}','{"Root rot"}','Drops leaves if moved or stressed.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Dracaena Marginata','Dracaena marginata','dracaena-marginata','Spiky red-edged leaves.','Bright indirect',10,25,50,18,27,30,50,'Well-draining mix','Balanced monthly','Toxic to pets','{"Spider mites",Mealybugs}','{"Fluoride tip burn"}','Use filtered water.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('English Ivy','Hedera helix','english-ivy','Climbing vine, variegated forms.','Bright indirect',7,35,55,10,21,40,60,'Standard potting mix','Balanced monthly','Toxic to pets','{"Spider mites",Aphids}','{"Leaf spot"}','Cool temps preferred. Watch for spider mites.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Fiddle Leaf Fig','Ficus lyrata','fiddle-leaf-fig','Large violin-shaped leaves.','Bright indirect',7,35,55,18,24,40,60,'Well-draining potting mix','Balanced monthly','Toxic to pets','{"Spider mites",Mealybugs}','{"Root rot","Bacterial leaf spot"}','Hates being moved. Keep consistent light and watering.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Hoya Carnosa','Hoya carnosa','hoya-carnosa','Waxy leaves, star-shaped flowers.','Bright indirect',10,25,45,16,27,40,60,'Well-draining mix','Balanced monthly','Non-toxic','{Mealybugs,Aphids}','{"Root rot"}','Slow grower. Don''t move once blooming.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Jade Plant','Crassula ovata','jade-plant','Chunky succulent shrub.','Bright direct',14,10,30,10,24,20,40,'Cactus mix','Cactus fertilizer quarterly','Toxic to pets','{Mealybugs}','{"Root rot"}','Let soil dry fully between waterings.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Kalanchoe','Kalanchoe blossfeldiana','kalanchoe','Compact succulent with bright flowers.','Bright direct',10,15,35,15,27,30,50,'Cactus mix','Bloom fertilizer monthly','Toxic to pets','{Aphids,Mealybugs}','{"Powdery mildew"}','Full sun to bloom.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Monstera Deliciosa','Monstera deliciosa','monstera','Iconic split-leaf tropical.','Bright indirect',7,35,60,18,27,50,70,'Aroid mix (bark + perlite)','Balanced monthly','Toxic to pets','{"Spider mites",Thrips}','{"Root rot"}','Provide moss pole. Water when top 2 inches dry.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Orchid (Phalaenopsis)','Phalaenopsis','phalaenopsis-orchid','Elegant moth orchid.','Bright indirect',10,20,45,18,29,50,70,'Orchid bark','Orchid fertilizer weekly-weakly','Non-toxic','{Mealybugs,Scale}','{"Crown rot","Root rot"}','Ice cube method works. Never let sit in water.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Parlor Palm','Chamaedorea elegans','parlor-palm','Compact, low-light tolerant palm.','Low to bright indirect',7,35,55,18,27,40,60,'Standard potting mix','Balanced monthly','Non-toxic','{"Spider mites",Mealybugs}','{"Root rot"}','Excellent for offices.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Peace Lily','Spathiphyllum wallisii','peace-lily','Elegant white blooms, glossy leaves.','Low to medium indirect',5,40,65,18,27,50,70,'Peat-based mix','Balanced monthly','Toxic to pets','{Aphids,"Spider mites"}','{"Root rot","Leaf yellowing"}','Droops when thirsty - a helpful signal. Keep moist.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Philodendron Heartleaf','Philodendron hederaceum','philodendron-heartleaf','Fast-growing trailing vine.','Low to bright indirect',7,35,55,18,27,40,60,'Aroid mix','Balanced monthly','Toxic to pets','{Aphids,Mealybugs}','{"Root rot"}','Very forgiving. Prune to shape.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Ponytail Palm','Beaucarnea recurvata','ponytail-palm','Bulbous trunk, cascading leaves.','Bright direct',21,15,30,16,29,30,50,'Cactus mix','Cactus fertilizer quarterly','Non-toxic','{"Spider mites"}','{"Root rot"}','Actually a succulent. Water sparingly.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Pothos','Epipremnum aureum','pothos','Trailing vine with heart-shaped variegated leaves.','Low to bright indirect',7,30,55,18,29,40,60,'Standard potting mix','Balanced monthly','Toxic to pets','{Mealybugs,Scale}','{"Root rot","Leaf spot"}','Water when top inch of soil is dry. Trim to encourage bushiness.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Prayer Plant','Maranta leuconeura','prayer-plant','Leaves fold up at night.','Medium indirect',5,45,65,18,27,60,80,'Peat-based mix','Diluted balanced monthly','Non-toxic','{"Spider mites",Mealybugs}','{"Leaf spot"}','Loves humidity, hates cold drafts.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Rubber Plant','Ficus elastica','rubber-plant','Glossy dark leaves.','Bright indirect',7,30,55,16,24,40,60,'Well-draining mix','Balanced monthly','Toxic to pets','{Mealybugs,Scale}','{"Root rot"}','Wipe leaves to keep glossy.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Snake Plant','Sansevieria trifasciata','snake-plant','Tough, upright succulent with sword-like leaves.','Low to bright indirect',14,20,40,15,29,30,50,'Well-draining cactus mix','Balanced 10-10-10 monthly in growing season','Mildly toxic to pets','{Mealybugs,"Spider mites"}','{"Root rot"}','Let soil dry completely between waterings. Very forgiving.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('Spider Plant','Chlorophytum comosum','spider-plant','Arching striped leaves, produces plantlets.','Bright indirect',7,30,55,15,27,40,60,'Standard potting mix','Balanced monthly','Non-toxic','{"Spider mites",Aphids}','{"Tip burn from fluoride"}','Use filtered water if tips brown. Very easy.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('String of Pearls','Senecio rowleyanus','string-of-pearls','Trailing bead-like succulent.','Bright indirect',14,10,25,18,24,30,50,'Cactus mix','Cactus fertilizer quarterly','Toxic to pets','{Aphids,Mealybugs}','{"Root rot"}','Very sensitive to overwatering.',NULL,'seed');
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips, image_url, source) VALUES ('ZZ Plant','Zamioculcas zamiifolia','zz-plant','Waxy, glossy leaves. Drought tolerant.','Low to bright indirect',14,15,35,18,26,30,50,'Well-draining mix','Diluted balanced quarterly','Toxic to pets','{Mealybugs}','{"Root rot"}','Water sparingly. Extremely forgiving of neglect.',NULL,'seed');
