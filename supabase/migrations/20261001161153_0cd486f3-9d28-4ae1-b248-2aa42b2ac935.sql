CREATE OR REPLACE FUNCTION public.process_due_account_deletions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT d.id, d.user_id, d.requested_at FROM public.account_deletion_requests d
           WHERE d.cancelled_at IS NULL AND d.completed_at IS NULL AND d.scheduled_for <= now()
             AND NOT EXISTS (SELECT 1 FROM public.plant_photos p WHERE p.user_id = d.user_id)
             AND NOT EXISTS (SELECT 1 FROM public.feedback f WHERE f.user_id = d.user_id AND f.screenshot_path IS NOT NULL)
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

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_friendship() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_reaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_on_new_plant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_on_photo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_on_plant_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_on_watering() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_plant_last_watered() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
-- Signed-out visitors never need these lookups.
REVOKE EXECUTE ON FUNCTION public.user_friend_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_plant_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profiles_public_by_ids(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_sellers_by_ids(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_by_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_friend_count(uuid), public.user_plant_count(uuid),
  public.search_profiles(text, integer), public.profiles_public_by_ids(uuid[]),
  public.marketplace_sellers_by_ids(uuid[]), public.get_profile_by_username(text) TO authenticated, service_role;