-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  idf_number TEXT NOT NULL UNIQUE,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'amateur', 'expert')),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
  total_signups INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- ============================================================
-- Sessions (weekly time slots)
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  time_slot TIME NOT NULL,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('beginner', 'amateur', 'expert')),
  capacity INTEGER NOT NULL DEFAULT 8,
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(week_start, time_slot)
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sessions" ON sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage sessions" ON sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- ============================================================
-- Registrations
-- ============================================================
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'waitlist', 'pending_confirmation')),
  waitlist_position INTEGER,
  waitlist_notified_at TIMESTAMPTZ,
  waitlist_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations" ON registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own registrations" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own registrations" ON registrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own registrations" ON registrations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all registrations" ON registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY "Admin can update all registrations" ON registrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- ============================================================
-- Notifications (in-app)
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications (from edge functions)
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- Helper functions
-- ============================================================

-- Get confirmed count per session (batch)
CREATE OR REPLACE FUNCTION get_confirmed_counts(session_ids UUID[])
RETURNS TABLE(session_id UUID, count INTEGER) AS $$
  SELECT session_id, COUNT(*)::INTEGER
  FROM registrations
  WHERE session_id = ANY($1) AND status = 'confirmed'
  GROUP BY session_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Increment total signups
CREATE OR REPLACE FUNCTION increment_total_signups(uid UUID)
RETURNS VOID AS $$
  UPDATE profiles SET total_signups = total_signups + 1 WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Decrement total signups (floor at 0)
CREATE OR REPLACE FUNCTION decrement_total_signups(uid UUID)
RETURNS VOID AS $$
  UPDATE profiles SET total_signups = GREATEST(0, total_signups - 1) WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER;
