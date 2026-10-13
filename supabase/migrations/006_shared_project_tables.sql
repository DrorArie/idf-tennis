-- Tennis now lives in the shared Supabase project "Dror Apps" (nukbnjncacuhvaounuyd).
-- Fresh start: no data copied. Run once in that project's SQL editor.
-- Creates only new tennis_* tables and functions; nothing else is touched. Safe to run twice.

-- ============================================================
-- Tables (same as 001–005, prefixed tennis_)
-- ============================================================
CREATE TABLE IF NOT EXISTS tennis_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  idf_number TEXT DEFAULT '',
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'amateur', 'expert_a', 'expert_b')),
  service_type TEXT NOT NULL DEFAULT 'keva' CHECK (service_type IN ('keva', 'ezrach')),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
  total_signups INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tennis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  time_slot TIME NOT NULL,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'amateur', 'expert_a', 'expert_b')),
  capacity INTEGER NOT NULL DEFAULT 8,
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_start, time_slot)
);

CREATE TABLE IF NOT EXISTS tennis_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tennis_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES tennis_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'waitlist')),
  waitlist_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS tennis_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES tennis_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tennis_registrations_user_idx ON tennis_registrations(user_id);
CREATE INDEX IF NOT EXISTS tennis_notifications_user_idx ON tennis_notifications(user_id, created_at DESC);

-- ============================================================
-- Functions
-- ============================================================
CREATE OR REPLACE FUNCTION tennis_is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM public.tennis_profiles WHERE id = uid), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION tennis_get_confirmed_counts(session_ids UUID[])
RETURNS TABLE(session_id UUID, count INTEGER) AS $$
  SELECT r.session_id, COUNT(*)::INTEGER
  FROM public.tennis_registrations r
  WHERE r.session_id = ANY($1) AND r.status = 'confirmed'
  GROUP BY r.session_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION tennis_increment_total_signups(uid UUID)
RETURNS VOID AS $$
  UPDATE public.tennis_profiles SET total_signups = total_signups + 1 WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION tennis_decrement_total_signups(uid UUID)
RETURNS VOID AS $$
  UPDATE public.tennis_profiles SET total_signups = GREATEST(0, total_signups - 1) WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Signup counters are changed only by the server.
REVOKE EXECUTE ON FUNCTION tennis_increment_total_signups(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION tennis_decrement_total_signups(UUID) FROM PUBLIC, anon, authenticated;

-- Users may edit their own profile but not make themselves admin, unblock
-- themselves, or change their signup counter.
CREATE OR REPLACE FUNCTION tennis_protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT tennis_is_admin(auth.uid()) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_blacklisted := OLD.is_blacklisted;
    NEW.total_signups := OLD.total_signups;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tennis_protect_profile_columns ON tennis_profiles;
CREATE TRIGGER tennis_protect_profile_columns
  BEFORE UPDATE ON tennis_profiles
  FOR EACH ROW EXECUTE FUNCTION tennis_protect_profile_columns();

-- ============================================================
-- Row level security (same rules as before; admin check via tennis_is_admin)
-- ============================================================
ALTER TABLE tennis_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tennis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tennis_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tennis_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON tennis_profiles;
CREATE POLICY "Users can view own profile" ON tennis_profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON tennis_profiles;
CREATE POLICY "Users can update own profile" ON tennis_profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admin can view all profiles" ON tennis_profiles;
CREATE POLICY "Admin can view all profiles" ON tennis_profiles FOR SELECT USING (tennis_is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admin can update all profiles" ON tennis_profiles;
CREATE POLICY "Admin can update all profiles" ON tennis_profiles FOR UPDATE USING (tennis_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view sessions" ON tennis_sessions;
CREATE POLICY "Authenticated users can view sessions" ON tennis_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin can manage sessions" ON tennis_sessions;
CREATE POLICY "Admin can manage sessions" ON tennis_sessions FOR ALL USING (tennis_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own registrations" ON tennis_registrations;
CREATE POLICY "Users can view own registrations" ON tennis_registrations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own registrations" ON tennis_registrations;
CREATE POLICY "Users can insert own registrations" ON tennis_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own registrations" ON tennis_registrations;
CREATE POLICY "Users can update own registrations" ON tennis_registrations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own registrations" ON tennis_registrations;
CREATE POLICY "Users can delete own registrations" ON tennis_registrations FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can view all registrations" ON tennis_registrations;
CREATE POLICY "Admin can view all registrations" ON tennis_registrations FOR SELECT USING (tennis_is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admin can update all registrations" ON tennis_registrations;
CREATE POLICY "Admin can update all registrations" ON tennis_registrations FOR UPDATE USING (tennis_is_admin(auth.uid()));

-- Notifications are written only by the server (service role bypasses RLS).
DROP POLICY IF EXISTS "Users can view own notifications" ON tennis_notifications;
CREATE POLICY "Users can view own notifications" ON tennis_notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON tennis_notifications;
CREATE POLICY "Users can update own notifications" ON tennis_notifications FOR UPDATE USING (auth.uid() = user_id);

-- The notification bell listens for new rows live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tennis_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tennis_notifications;
  END IF;
END $$;

-- ============================================================
-- Make yourself tennis admin: after you sign up again in the tennis app,
-- run this line with your email.
-- UPDATE tennis_profiles SET is_admin = TRUE WHERE email = 'YOUR-EMAIL';
-- ============================================================
