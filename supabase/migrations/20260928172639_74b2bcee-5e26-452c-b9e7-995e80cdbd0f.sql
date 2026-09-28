CREATE TABLE public.plant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.user_plants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  amount_ml integer,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_events TO authenticated;
GRANT ALL ON public.plant_events TO service_role;

ALTER TABLE public.plant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plant events"
ON public.plant_events FOR SELECT TO authenticated
USING (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.user_plants p
  WHERE p.id = plant_events.plant_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users create own plant events"
ON public.plant_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.user_plants p
  WHERE p.id = plant_events.plant_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users update own plant events"
ON public.plant_events FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.user_plants p
  WHERE p.id = plant_events.plant_id AND p.user_id = auth.uid()
))
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.user_plants p
  WHERE p.id = plant_events.plant_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users delete own plant events"
ON public.plant_events FOR DELETE TO authenticated
USING (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.user_plants p
  WHERE p.id = plant_events.plant_id AND p.user_id = auth.uid()
));

CREATE INDEX plant_events_plant_occurred_idx
ON public.plant_events (plant_id, occurred_at DESC);

CREATE INDEX plant_events_plant_type_occurred_idx
ON public.plant_events (plant_id, event_type, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.validate_plant_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT p.user_id INTO owner_id
  FROM public.user_plants p
  WHERE p.id = NEW.plant_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Plant not found';
  END IF;

  IF NEW.user_id <> owner_id THEN
    RAISE EXCEPTION 'Event owner must match plant owner';
  END IF;

  IF NEW.event_type !~ '^[a-z][a-z0-9_]{1,39}$' THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  IF NEW.source NOT IN ('manual', 'sensor', 'system') THEN
    RAISE EXCEPTION 'Invalid event source';
  END IF;

  IF NEW.amount_ml IS NOT NULL AND NEW.amount_ml < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER plant_events_validate
BEFORE INSERT OR UPDATE ON public.plant_events
FOR EACH ROW EXECUTE FUNCTION public.validate_plant_event();

CREATE TRIGGER plant_events_set_updated_at
BEFORE UPDATE ON public.plant_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plant_events (
  id, plant_id, user_id, event_type, occurred_at, amount_ml, notes, metadata, source, created_at, updated_at
)
SELECT
  w.id,
  w.plant_id,
  p.user_id,
  'watering',
  w.watered_at,
  w.amount_ml,
  w.notes,
  jsonb_build_object('legacy_watering_event_id', w.id),
  CASE WHEN coalesce(w.notes, '') ILIKE '%automatic%' OR coalesce(w.notes, '') ILIKE '%sensor%' THEN 'sensor' ELSE 'manual' END,
  w.created_at,
  w.created_at
FROM public.watering_events w
JOIN public.user_plants p ON p.id = w.plant_id
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_plant_last_watered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_plant_id uuid;
BEGIN
  affected_plant_id := COALESCE(NEW.plant_id, OLD.plant_id);

  IF TG_OP = 'DELETE' OR OLD.event_type = 'watering' OR NEW.event_type = 'watering' THEN
    UPDATE public.user_plants p
    SET last_watered_at = (
      SELECT max(e.occurred_at)
      FROM public.plant_events e
      WHERE e.plant_id = affected_plant_id AND e.event_type = 'watering'
    )
    WHERE p.id = affected_plant_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER plant_events_sync_last_watered
AFTER INSERT OR UPDATE OR DELETE ON public.plant_events
FOR EACH ROW EXECUTE FUNCTION public.sync_plant_last_watered();

UPDATE public.user_plants p
SET last_watered_at = latest.last_watered_at
FROM (
  SELECT plant_id, max(occurred_at) AS last_watered_at
  FROM public.plant_events
  WHERE event_type = 'watering'
  GROUP BY plant_id
) latest
WHERE p.id = latest.plant_id;

CREATE OR REPLACE FUNCTION public.post_on_plant_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nick text;
BEGIN
  SELECT p.nickname INTO nick
  FROM public.user_plants p
  WHERE p.id = NEW.plant_id;

  INSERT INTO public.posts (author_id, plant_id, kind, body, payload, dedup_key)
  VALUES (
    NEW.user_id,
    NEW.plant_id,
    NEW.event_type,
    NEW.notes,
    jsonb_build_object(
      'nickname', nick,
      'amount_ml', NEW.amount_ml,
      'source', NEW.source,
      'event_id', NEW.id,
      'metadata', NEW.metadata
    ),
    'plant_event:' || NEW.id
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER plant_events_create_post
AFTER INSERT ON public.plant_events
FOR EACH ROW EXECUTE FUNCTION public.post_on_plant_event();