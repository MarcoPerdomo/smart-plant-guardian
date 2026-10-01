CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_deletion_requests_one_pending
  ON public.account_deletion_requests (user_id) WHERE cancelled_at IS NULL AND completed_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own deletion requests" ON public.account_deletion_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own deletion request" ON public.account_deletion_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND cancelled_at IS NULL AND completed_at IS NULL);
CREATE POLICY "Users cancel own deletion request" ON public.account_deletion_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND completed_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND completed_at IS NULL);

-- Users may only set cancelled_at; schedule and completion are fixed server-side.
CREATE OR REPLACE FUNCTION public.guard_account_deletion_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.requested_at := now();
    NEW.scheduled_for := now() + interval '30 days';
  ELSIF current_user = 'authenticated' THEN
    NEW.user_id := OLD.user_id;
    NEW.requested_at := OLD.requested_at;
    NEW.scheduled_for := OLD.scheduled_for;
    NEW.completed_at := OLD.completed_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER account_deletion_requests_guard
  BEFORE INSERT OR UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_account_deletion_request();

-- Daily purge: removes accounts whose 30-day grace period has passed.
CREATE OR REPLACE FUNCTION public.process_due_account_deletions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id, user_id, requested_at FROM public.account_deletion_requests
           WHERE cancelled_at IS NULL AND completed_at IS NULL AND scheduled_for <= now()
  LOOP
    DELETE FROM auth.users WHERE id = r.user_id;
    UPDATE public.account_deletion_requests SET completed_at = now(), reason = NULL WHERE id = r.id;
    INSERT INTO public.archived_records (entity_type, entity_id, owner_id, snapshot, reason, archived_by)
    VALUES ('account_deleted', r.user_id, NULL,
            jsonb_build_object('requested_at', r.requested_at, 'deleted_at', now()),
            'Account deleted after 30-day grace period', r.user_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.process_due_account_deletions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_account_deletions() TO service_role;