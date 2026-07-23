
-- =====================
-- profiles
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  notify_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  notify_email BOOLEAN NOT NULL DEFAULT FALSE,
  notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- plant_species (shared catalog)
-- =====================
CREATE TABLE public.plant_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  light TEXT,
  water_frequency_days INT,
  soil_moisture_min INT,
  soil_moisture_max INT,
  temperature_min_c NUMERIC,
  temperature_max_c NUMERIC,
  humidity_min INT,
  humidity_max INT,
  soil TEXT,
  fertilizer TEXT,
  toxicity TEXT,
  common_pests TEXT[],
  common_diseases TEXT[],
  care_tips TEXT,
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plant_species_common_name_idx ON public.plant_species (lower(common_name));
GRANT SELECT ON public.plant_species TO authenticated;
GRANT ALL ON public.plant_species TO service_role;
ALTER TABLE public.plant_species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read catalog" ON public.plant_species FOR SELECT TO authenticated USING (true);

-- =====================
-- user_plants
-- =====================
CREATE TABLE public.user_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID REFERENCES public.plant_species(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  image_url TEXT,
  device_id TEXT,
  last_watered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_plants_user_id_idx ON public.user_plants (user_id);
CREATE INDEX user_plants_device_id_idx ON public.user_plants (device_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plants TO authenticated;
GRANT ALL ON public.user_plants TO service_role;
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plants" ON public.user_plants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================
-- sensor_readings
-- =====================
CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  soil_moisture NUMERIC,
  temperature_c NUMERIC,
  humidity NUMERIC,
  light_lux NUMERIC,
  motion_events INT,
  extra JSONB,
  source_device TEXT
);
CREATE INDEX sensor_readings_plant_time_idx ON public.sensor_readings (plant_id, recorded_at DESC);
GRANT SELECT ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plant readings" ON public.sensor_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = sensor_readings.plant_id AND p.user_id = auth.uid())
);

-- =====================
-- watering_events
-- =====================
CREATE TABLE public.watering_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  watered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_ml INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX watering_events_plant_time_idx ON public.watering_events (plant_id, watered_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watering_events TO authenticated;
GRANT ALL ON public.watering_events TO service_role;
ALTER TABLE public.watering_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watering" ON public.watering_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = watering_events.plant_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = watering_events.plant_id AND p.user_id = auth.uid())
);

-- =====================
-- ai_summaries
-- =====================
CREATE TABLE public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  recommendations JSONB
);
CREATE INDEX ai_summaries_plant_time_idx ON public.ai_summaries (plant_id, created_at DESC);
GRANT SELECT ON public.ai_summaries TO authenticated;
GRANT ALL ON public.ai_summaries TO service_role;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own summaries" ON public.ai_summaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_plants p WHERE p.id = ai_summaries.plant_id AND p.user_id = auth.uid())
);

-- =====================
-- notifications
-- =====================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.user_plants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================
-- updated_at helpers
-- =====================
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_plants_updated BEFORE UPDATE ON public.user_plants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================
-- Seed a curated set of common houseplants
-- =====================
INSERT INTO public.plant_species (common_name, scientific_name, slug, description, light, water_frequency_days, soil_moisture_min, soil_moisture_max, temperature_min_c, temperature_max_c, humidity_min, humidity_max, soil, fertilizer, toxicity, common_pests, common_diseases, care_tips) VALUES
('Snake Plant','Sansevieria trifasciata','snake-plant','Tough, upright succulent with sword-like leaves.','Low to bright indirect',14,20,40,15,29,30,50,'Well-draining cactus mix','Balanced 10-10-10 monthly in growing season','Mildly toxic to pets',ARRAY['Mealybugs','Spider mites'],ARRAY['Root rot'],'Let soil dry completely between waterings. Very forgiving.'),
('Pothos','Epipremnum aureum','pothos','Trailing vine with heart-shaped variegated leaves.','Low to bright indirect',7,30,55,18,29,40,60,'Standard potting mix','Balanced monthly','Toxic to pets',ARRAY['Mealybugs','Scale'],ARRAY['Root rot','Leaf spot'],'Water when top inch of soil is dry. Trim to encourage bushiness.'),
('Monstera Deliciosa','Monstera deliciosa','monstera','Iconic split-leaf tropical.','Bright indirect',7,35,60,18,27,50,70,'Aroid mix (bark + perlite)','Balanced monthly','Toxic to pets',ARRAY['Spider mites','Thrips'],ARRAY['Root rot'],'Provide moss pole. Water when top 2 inches dry.'),
('ZZ Plant','Zamioculcas zamiifolia','zz-plant','Waxy, glossy leaves. Drought tolerant.','Low to bright indirect',14,15,35,18,26,30,50,'Well-draining mix','Diluted balanced quarterly','Toxic to pets',ARRAY['Mealybugs'],ARRAY['Root rot'],'Water sparingly. Extremely forgiving of neglect.'),
('Peace Lily','Spathiphyllum wallisii','peace-lily','Elegant white blooms, glossy leaves.','Low to medium indirect',5,40,65,18,27,50,70,'Peat-based mix','Balanced monthly','Toxic to pets',ARRAY['Aphids','Spider mites'],ARRAY['Root rot','Leaf yellowing'],'Droops when thirsty - a helpful signal. Keep moist.'),
('Spider Plant','Chlorophytum comosum','spider-plant','Arching striped leaves, produces plantlets.','Bright indirect',7,30,55,15,27,40,60,'Standard potting mix','Balanced monthly','Non-toxic',ARRAY['Spider mites','Aphids'],ARRAY['Tip burn from fluoride'],'Use filtered water if tips brown. Very easy.'),
('Fiddle Leaf Fig','Ficus lyrata','fiddle-leaf-fig','Large violin-shaped leaves.','Bright indirect',7,35,55,18,24,40,60,'Well-draining potting mix','Balanced monthly','Toxic to pets',ARRAY['Spider mites','Mealybugs'],ARRAY['Root rot','Bacterial leaf spot'],'Hates being moved. Keep consistent light and watering.'),
('Rubber Plant','Ficus elastica','rubber-plant','Glossy dark leaves.','Bright indirect',7,30,55,16,24,40,60,'Well-draining mix','Balanced monthly','Toxic to pets',ARRAY['Mealybugs','Scale'],ARRAY['Root rot'],'Wipe leaves to keep glossy.'),
('Aloe Vera','Aloe barbadensis miller','aloe-vera','Medicinal succulent.','Bright direct',21,10,30,13,27,20,40,'Cactus / succulent mix','Cactus fertilizer quarterly','Mildly toxic to pets',ARRAY['Mealybugs'],ARRAY['Root rot'],'Water deeply but infrequently.'),
('Jade Plant','Crassula ovata','jade-plant','Chunky succulent shrub.','Bright direct',14,10,30,10,24,20,40,'Cactus mix','Cactus fertilizer quarterly','Toxic to pets',ARRAY['Mealybugs'],ARRAY['Root rot'],'Let soil dry fully between waterings.'),
('Boston Fern','Nephrolepis exaltata','boston-fern','Feathery arching fronds.','Bright indirect',3,50,70,15,24,60,80,'Peat-based mix','Diluted balanced monthly','Non-toxic',ARRAY['Scale','Mealybugs'],ARRAY['Fungal leaf spot'],'Loves humidity. Mist frequently.'),
('English Ivy','Hedera helix','english-ivy','Climbing vine, variegated forms.','Bright indirect',7,35,55,10,21,40,60,'Standard potting mix','Balanced monthly','Toxic to pets',ARRAY['Spider mites','Aphids'],ARRAY['Leaf spot'],'Cool temps preferred. Watch for spider mites.'),
('Philodendron Heartleaf','Philodendron hederaceum','philodendron-heartleaf','Fast-growing trailing vine.','Low to bright indirect',7,35,55,18,27,40,60,'Aroid mix','Balanced monthly','Toxic to pets',ARRAY['Aphids','Mealybugs'],ARRAY['Root rot'],'Very forgiving. Prune to shape.'),
('Calathea Orbifolia','Calathea orbifolia','calathea-orbifolia','Striped round leaves that move day/night.','Medium indirect',4,50,70,18,27,60,80,'Peat-based mix','Diluted balanced monthly','Non-toxic',ARRAY['Spider mites','Thrips'],ARRAY['Leaf spot'],'Use distilled water. High humidity essential.'),
('Bird of Paradise','Strelitzia nicolai','bird-of-paradise','Large banana-like leaves.','Bright direct',7,35,60,18,29,50,70,'Well-draining loamy mix','Balanced monthly','Mildly toxic to pets',ARRAY['Spider mites','Scale'],ARRAY['Root rot'],'Give it space and lots of light.'),
('Chinese Evergreen','Aglaonema commutatum','chinese-evergreen','Colorful patterned leaves.','Low to medium indirect',10,30,55,18,27,40,60,'Standard potting mix','Balanced monthly','Toxic to pets',ARRAY['Mealybugs','Spider mites'],ARRAY['Root rot'],'Tolerates low light beautifully.'),
('Dracaena Marginata','Dracaena marginata','dracaena-marginata','Spiky red-edged leaves.','Bright indirect',10,25,50,18,27,30,50,'Well-draining mix','Balanced monthly','Toxic to pets',ARRAY['Spider mites','Mealybugs'],ARRAY['Fluoride tip burn'],'Use filtered water.'),
('Croton','Codiaeum variegatum','croton','Vibrant multicolored foliage.','Bright direct',5,40,60,18,29,50,70,'Rich potting mix','Balanced monthly','Toxic to pets',ARRAY['Spider mites','Mealybugs'],ARRAY['Root rot'],'Drops leaves if moved or stressed.'),
('Anthurium','Anthurium andraeanum','anthurium','Glossy heart-shaped red spathes.','Bright indirect',5,40,60,18,29,60,80,'Aroid mix','Balanced monthly','Toxic to pets',ARRAY['Aphids','Thrips'],ARRAY['Root rot','Bacterial blight'],'Loves humidity. Water when top inch dry.'),
('String of Pearls','Senecio rowleyanus','string-of-pearls','Trailing bead-like succulent.','Bright indirect',14,10,25,18,24,30,50,'Cactus mix','Cactus fertilizer quarterly','Toxic to pets',ARRAY['Aphids','Mealybugs'],ARRAY['Root rot'],'Very sensitive to overwatering.'),
('Hoya Carnosa','Hoya carnosa','hoya-carnosa','Waxy leaves, star-shaped flowers.','Bright indirect',10,25,45,16,27,40,60,'Well-draining mix','Balanced monthly','Non-toxic',ARRAY['Mealybugs','Aphids'],ARRAY['Root rot'],'Slow grower. Don''t move once blooming.'),
('African Violet','Saintpaulia','african-violet','Fuzzy leaves and bright blooms.','Bright indirect',5,45,65,18,24,50,60,'African violet mix','Bloom fertilizer bi-weekly','Non-toxic',ARRAY['Mealybugs','Thrips'],ARRAY['Crown rot'],'Water from below with room-temp water.'),
('Bromeliad','Guzmania lingulata','bromeliad','Bright bracts atop rosette of leaves.','Bright indirect',7,30,50,16,29,60,80,'Bromeliad / orchid mix','Diluted balanced monthly','Non-toxic',ARRAY['Scale','Mealybugs'],ARRAY['Crown rot'],'Water into central cup, empty weekly.'),
('Orchid (Phalaenopsis)','Phalaenopsis','phalaenopsis-orchid','Elegant moth orchid.','Bright indirect',10,20,45,18,29,50,70,'Orchid bark','Orchid fertilizer weekly-weakly','Non-toxic',ARRAY['Mealybugs','Scale'],ARRAY['Crown rot','Root rot'],'Ice cube method works. Never let sit in water.'),
('Prayer Plant','Maranta leuconeura','prayer-plant','Leaves fold up at night.','Medium indirect',5,45,65,18,27,60,80,'Peat-based mix','Diluted balanced monthly','Non-toxic',ARRAY['Spider mites','Mealybugs'],ARRAY['Leaf spot'],'Loves humidity, hates cold drafts.'),
('Ponytail Palm','Beaucarnea recurvata','ponytail-palm','Bulbous trunk, cascading leaves.','Bright direct',21,15,30,16,29,30,50,'Cactus mix','Cactus fertilizer quarterly','Non-toxic',ARRAY['Spider mites'],ARRAY['Root rot'],'Actually a succulent. Water sparingly.'),
('Areca Palm','Dypsis lutescens','areca-palm','Feathery arching fronds.','Bright indirect',5,40,60,18,29,50,70,'Well-draining potting mix','Balanced monthly','Non-toxic',ARRAY['Spider mites','Scale'],ARRAY['Tip burn'],'Use filtered water. Loves humidity.'),
('Parlor Palm','Chamaedorea elegans','parlor-palm','Compact, low-light tolerant palm.','Low to bright indirect',7,35,55,18,27,40,60,'Standard potting mix','Balanced monthly','Non-toxic',ARRAY['Spider mites','Mealybugs'],ARRAY['Root rot'],'Excellent for offices.'),
('Kalanchoe','Kalanchoe blossfeldiana','kalanchoe','Compact succulent with bright flowers.','Bright direct',10,15,35,15,27,30,50,'Cactus mix','Bloom fertilizer monthly','Toxic to pets',ARRAY['Aphids','Mealybugs'],ARRAY['Powdery mildew'],'Full sun to bloom.'),
('Christmas Cactus','Schlumbergera bridgesii','christmas-cactus','Flowers around holidays.','Bright indirect',10,30,50,15,24,50,60,'Cactus mix + peat','Balanced monthly (bloom fert. in fall)','Non-toxic',ARRAY['Mealybugs','Scale'],ARRAY['Root rot','Stem rot'],'Cool nights trigger blooms.');
