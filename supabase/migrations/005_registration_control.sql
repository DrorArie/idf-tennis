-- Each session gets its own registration deadline.
-- Auto-open sets it to Thursday 12:00; when an admin opens registration manually after
-- the deadline it is cleared, so registration stays open until the admin closes it.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;

-- Existing open sessions keep the normal Thursday 12:00 (Israel time) deadline,
-- unless it already passed (then an admin reopened them on purpose — leave them open).
UPDATE sessions
SET closes_at = ((week_start + 2)::timestamp + TIME '12:00') AT TIME ZONE 'Asia/Jerusalem'
WHERE closes_at IS NULL
  AND is_open = TRUE
  AND ((week_start + 2)::timestamp + TIME '12:00') AT TIME ZONE 'Asia/Jerusalem' > NOW();

-- Notifications are written only by the server (service role bypasses RLS).
-- This policy let any signed-in user create notifications for anyone.
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Signup counters are changed only by the server now; stop users calling these directly.
REVOKE EXECUTE ON FUNCTION increment_total_signups(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION decrement_total_signups(UUID) FROM PUBLIC, anon, authenticated;
