-- Users may update their own profile (name, phone, skill_level), but must not be able
-- to make themselves admin, unblock themselves, or change their signup counter.
-- Admins (and the service role / SECURITY DEFINER functions) are unaffected.

CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = uid), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- current_user is 'authenticated'/'anon' only for direct client requests;
  -- service role and SECURITY DEFINER functions (increment_total_signups) run as other roles.
  IF current_user IN ('authenticated', 'anon') AND NOT is_admin(auth.uid()) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_blacklisted := OLD.is_blacklisted;
    NEW.total_signups := OLD.total_signups;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_columns ON profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();
