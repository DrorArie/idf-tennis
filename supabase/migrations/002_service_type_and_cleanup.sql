-- Add service_type to profiles
ALTER TABLE profiles
  ADD COLUMN service_type TEXT NOT NULL DEFAULT 'keva'
  CHECK (service_type IN ('keva', 'ezrach'));

-- Add email to profiles (needed for sending email notifications)
ALTER TABLE profiles ADD COLUMN email TEXT;
UPDATE profiles SET email = (
  SELECT email FROM auth.users WHERE auth.users.id = profiles.id
);
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Remove stale waitlist columns (no more pending_confirmation flow)
ALTER TABLE registrations
  DROP COLUMN IF EXISTS waitlist_expires_at,
  DROP COLUMN IF EXISTS waitlist_notified_at;

-- Convert any existing pending_confirmation rows to waitlist
UPDATE registrations SET status = 'waitlist' WHERE status = 'pending_confirmation';

-- Replace status check constraint
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('confirmed', 'waitlist'));
