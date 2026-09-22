CREATE TABLE public.premium_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  revoked_by uuid REFERENCES auth.users(id),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX premium_grants_user_idx ON public.premium_grants (user_id, revoked_at, expires_at);

GRANT SELECT ON public.premium_grants TO authenticated;
GRANT ALL ON public.premium_grants TO service_role;

ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own premium grants"
ON public.premium_grants FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create premium grants"
ON public.premium_grants FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update premium grants"
ON public.premium_grants FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER premium_grants_set_updated_at
BEFORE UPDATE ON public.premium_grants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.premium_grants g
    WHERE g.user_id = _user_id
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > now())
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;