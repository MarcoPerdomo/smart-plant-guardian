CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
      AND p.deleted_at IS NULL
      AND (
        p.author_id = auth.uid()
        OR (p.visibility = 'friends' AND public.are_friends(p.author_id, auth.uid()))
        OR p.visibility = 'public'
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid) TO authenticated;

DROP POLICY IF EXISTS "Read comments on visible posts" ON public.post_comments;
CREATE POLICY "Read comments on visible posts" ON public.post_comments
FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users comment on visible posts" ON public.post_comments;
CREATE POLICY "Users comment on visible posts" ON public.post_comments
FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_view_post(post_id));

DROP POLICY IF EXISTS "Read reactions on visible posts" ON public.post_reactions;
CREATE POLICY "Read reactions on visible posts" ON public.post_reactions
FOR SELECT TO authenticated
USING (public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users add own reactions" ON public.post_reactions;
CREATE POLICY "Users add own reactions" ON public.post_reactions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_view_post(post_id));