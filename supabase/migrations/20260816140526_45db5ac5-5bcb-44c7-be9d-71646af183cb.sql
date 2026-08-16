-- ============ PROFILES: username & social fields ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS username_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

-- Safe public projection of profiles (definer view: bypasses profiles RLS by design)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
  SELECT id, username, display_name, avatar_url, bio, country_code, created_at
  FROM public.profiles
  WHERE username IS NOT NULL;

GRANT SELECT ON public.profiles_public TO authenticated;

-- ============ FRIENDSHIPS ============
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_key
  ON public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships (requester_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own friendships" ON public.friendships
  FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Users send friend requests" ON public.friendships
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "Participants update friendships" ON public.friendships
  FOR UPDATE TO authenticated USING (auth.uid() IN (requester_id, addressee_id))
  WITH CHECK (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Participants remove friendships" ON public.friendships
  FOR DELETE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));

CREATE TRIGGER friendships_set_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BLOCKS ============
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.blocks
  FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = _a AND f.addressee_id = _b) OR (f.requester_id = _b AND f.addressee_id = _a))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_blocked(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = _a AND b.blocked_id = _b) OR (b.blocker_id = _b AND b.blocked_id = _a)
  )
$$;

CREATE OR REPLACE FUNCTION public.user_plant_count(_user uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.user_plants p WHERE p.user_id = _user AND p.archived_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.user_friend_count(_user uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.friendships f
  WHERE f.status = 'accepted' AND _user IN (f.requester_id, f.addressee_id)
$$;

REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_blocked(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_plant_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_friend_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_plant_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_friend_count(uuid) TO authenticated, service_role;

-- ============ POSTS ============
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id uuid REFERENCES public.user_plants(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES public.plant_photos(id) ON DELETE SET NULL,
  kind text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'friends',
  dedup_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT posts_kind_check CHECK (kind IN ('watering','photo','new_plant','milestone','help')),
  CONSTRAINT posts_visibility_check CHECK (visibility IN ('friends','private','public'))
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_dedup_key_uidx ON public.posts (dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_feed_idx ON public.posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON public.posts (author_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or friends posts" ON public.posts
  FOR SELECT TO authenticated USING (
    deleted_at IS NULL AND (
      author_id = auth.uid()
      OR (visibility = 'friends' AND public.are_friends(author_id, auth.uid()))
      OR visibility = 'public'
    )
  );
CREATE POLICY "Users create own posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users update own posts" ON public.posts
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users delete own posts" ON public.posts
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REACTIONS ============
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS post_reactions_post_idx ON public.post_reactions (post_id);
GRANT SELECT, INSERT, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read reactions on visible posts" ON public.post_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reactions.post_id)
  );
CREATE POLICY "Users add own reactions" ON public.post_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reactions.post_id)
  );
CREATE POLICY "Users remove own reactions" ON public.post_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ COMMENTS ============
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments (post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read comments on visible posts" ON public.post_comments
  FOR SELECT TO authenticated USING (
    deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id)
  );
CREATE POLICY "Users comment on visible posts" ON public.post_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id)
  );
CREATE POLICY "Users update own comments" ON public.post_comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users delete own comments" ON public.post_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid());

-- ============ CONVERSATIONS / MESSAGES ============
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'direct',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversation_participants_user_idx ON public.conversation_participants (user_id);

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation AND cp.user_id = _user
  )
$$;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_participants, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read conversations" ON public.conversations
  FOR SELECT TO authenticated USING (public.is_conversation_participant(id, auth.uid()));
CREATE POLICY "Users create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Participants read participants" ON public.conversation_participants
  FOR SELECT TO authenticated USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users update own participation" ON public.conversation_participants
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Participants read messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid())
  );

-- ============ NOTIFICATIONS ============
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS link text;

-- ============ ACTIVITY TRIGGERS ============
CREATE OR REPLACE FUNCTION public.post_on_watering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; nick text;
BEGIN
  SELECT p.user_id, p.nickname INTO owner, nick FROM public.user_plants p WHERE p.id = NEW.plant_id;
  IF owner IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.posts (author_id, plant_id, kind, payload, dedup_key)
  VALUES (owner, NEW.plant_id, 'watering', jsonb_build_object('nickname', nick, 'amount_ml', NEW.amount_ml),
          'watering:' || NEW.plant_id || ':' || (NEW.watered_at AT TIME ZONE 'utc')::date)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.post_on_photo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nick text;
BEGIN
  SELECT p.nickname INTO nick FROM public.user_plants p WHERE p.id = NEW.plant_id;
  INSERT INTO public.posts (author_id, plant_id, photo_id, kind, body, payload, dedup_key)
  VALUES (NEW.user_id, NEW.plant_id, NEW.id, 'photo', NEW.caption,
          jsonb_build_object('nickname', nick, 'storage_path', NEW.storage_path),
          'photo:' || NEW.id)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.post_on_new_plant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.posts (author_id, plant_id, kind, payload, dedup_key)
  VALUES (NEW.user_id, NEW.id, 'new_plant', jsonb_build_object('nickname', NEW.nickname), 'new_plant:' || NEW.id)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS watering_events_create_post ON public.watering_events;
CREATE TRIGGER watering_events_create_post AFTER INSERT ON public.watering_events
  FOR EACH ROW EXECUTE FUNCTION public.post_on_watering();
DROP TRIGGER IF EXISTS plant_photos_create_post ON public.plant_photos;
CREATE TRIGGER plant_photos_create_post AFTER INSERT ON public.plant_photos
  FOR EACH ROW EXECUTE FUNCTION public.post_on_photo();
DROP TRIGGER IF EXISTS user_plants_create_post ON public.user_plants;
CREATE TRIGGER user_plants_create_post AFTER INSERT ON public.user_plants
  FOR EACH ROW EXECUTE FUNCTION public.post_on_new_plant();

-- ============ SOCIAL NOTIFICATION TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_on_friendship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT coalesce(display_name, '@' || username, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.requester_id;
    INSERT INTO public.notifications (user_id, kind, actor_id, title, body, link)
    VALUES (NEW.addressee_id, 'friend_request', NEW.requester_id, 'New friend request',
            coalesce(actor_name, 'Someone') || ' wants to connect', '/friends');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT coalesce(display_name, '@' || username, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, kind, actor_id, title, body, link)
    VALUES (NEW.requester_id, 'friend_accepted', NEW.addressee_id, 'Friend request accepted',
            coalesce(actor_name, 'Someone') || ' accepted your request', '/feed');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_author uuid; actor_name text;
BEGIN
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT coalesce(display_name, '@' || username, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, kind, actor_id, plant_id, title, body, link)
  VALUES (post_author, 'post_comment', NEW.author_id, NULL, 'New comment',
          coalesce(actor_name, 'Someone') || ' commented on your update', '/feed');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_author uuid; actor_name text;
BEGIN
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT coalesce(display_name, '@' || username, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, kind, actor_id, title, body, link)
  VALUES (post_author, 'post_reaction', NEW.user_id, 'New reaction',
          coalesce(actor_name, 'Someone') || ' reacted ' || NEW.emoji || ' to your update', '/feed');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text;
BEGIN
  SELECT coalesce(display_name, '@' || username, 'Someone') INTO actor_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, kind, actor_id, title, body, link)
  SELECT cp.user_id, 'message', NEW.sender_id, 'New message',
         coalesce(actor_name, 'Someone') || ': ' || left(NEW.body, 80), '/messages/' || NEW.conversation_id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.sender_id;
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS friendships_notify ON public.friendships;
CREATE TRIGGER friendships_notify AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friendship();
DROP TRIGGER IF EXISTS post_comments_notify ON public.post_comments;
CREATE TRIGGER post_comments_notify AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
DROP TRIGGER IF EXISTS post_reactions_notify ON public.post_reactions;
CREATE TRIGGER post_reactions_notify AFTER INSERT ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reaction();
DROP TRIGGER IF EXISTS messages_notify ON public.messages;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
