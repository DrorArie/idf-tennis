@AGENTS.md

# IDF Tennis — Project Guide

## What This Is

A Hebrew-language, RTL web app for IDF personnel to register for weekly tennis training sessions. Users sign up, pick their skill level and service type during registration, then register/cancel for their group's weekly slot. Sessions open automatically every Tuesday at 12:00 Israel time, close Thursday at 12:00, and take place on Friday.

---

## Tech Stack

- **Framework:** Next.js 16.2.2 (App Router) — read `node_modules/next/dist/docs/` before writing any Next.js code
- **React:** 19.2.4
- **Backend/Auth/DB:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Styling:** Tailwind CSS v4 (PostCSS plugin, not the old v3 config)
- **Language:** TypeScript
- **Email:** Nodemailer + Gmail SMTP (`lib/email.ts`) — requires `GMAIL_USER` + `GMAIL_APP_PASSWORD` env vars
- **Deployment:** Vercel (connected to GitHub, auto-deploys on push to main)

---

## Project Structure

```
app/
  (app)/           — authenticated routes
    dashboard/     — user's weekly session view
    admin/         — admin panel (is_admin flag required)
    profile/       — user profile + registration history
    layout.tsx     — bottom nav + notification bell
  (auth)/          — unauthenticated routes
    login/
    register/
  api/
    signup/        — POST: register for a session (notifies on waitlist join)
    cancel/        — POST: cancel; auto-promotes next waitlisted user
    cron/
      open-sessions/  — GET: opens weekly slots (Vercel cron, Tuesday 12:00 IL)
      close-sessions/ — GET: closes weekly slots (Vercel cron, Thursday 12:00 IL)
components/
  SessionCard.tsx  — client component for a single session
  NotificationBell.tsx
lib/
  email.ts         — sendEmail(to, subject, text) via Gmail SMTP; silent no-op if env vars missing
  notifications.ts — createNotification(supabase, userId, message); inserts to notifications table
  supabase/
    client.ts      — browser client
    server.ts      — server client (uses cookies)
supabase/
  migrations/      — 001 base schema, 002 service_type + waitlist cleanup, 003 idf_number optional, 004 stop users editing is_admin/is_blacklisted/total_signups
  functions/
    open-weekly-slots/   — Supabase Edge Function (legacy, Vercel cron is primary)
    expire-waitlist/     — NO-OP (pending_confirmation flow removed)
```

---

## Database Schema

### `profiles` (extends `auth.users`)
- `id`, `name`, `phone`, `email`, `skill_level`, `service_type`, `is_admin`, `is_blacklisted`, `total_signups`
- `idf_number` — nullable, optional (no longer collected at registration)
- `service_type` — `'keva'` (קבע) | `'ezrach'` (אזרח עובד צה"ל)
- RLS: users see/edit own row; admins see/edit all

### `sessions`
- `id`, `week_start` (DATE), `time_slot` (TIME), `skill_level`, `capacity` (default 8), `is_open`
- Unique on `(week_start, time_slot)`
- `week_start` is always a **Tuesday** date

### `registrations`
- `id`, `session_id`, `user_id`, `status` (`confirmed` | `waitlist`), `waitlist_position`
- Unique on `(session_id, user_id)`
- No `pending_confirmation` status — waitlist promotion is fully automatic

### `notifications`
- `id`, `user_id`, `message`, `is_read`
- Written by service role from API routes (not edge functions)

### DB Functions
- `get_confirmed_counts(session_ids UUID[])` — batch confirmed count per session
- `increment_total_signups(uid UUID)` — safely increments counter
- `decrement_total_signups(uid UUID)` — safely decrements (floor 0)

---

## Skill Levels & Time Slots

| skill_level | Time  | Label           |
|-------------|-------|-----------------|
| beginner    | 07:00 | מתחילים         |
| amateur     | 08:00 | חובבנים         |
| expert_a    | 09:00 | מתקדמים א׳      |
| expert_b    | 10:00 | מתקדמים ב׳      |

Each user can only register for their own skill group's session.

---

## Key Business Logic

- **Week start:** The active week's Tuesday (Israel time, `Asia/Jerusalem`); Sat–Mon it already points to next Tuesday. All week/time logic lives in `lib/week.ts` (`getActiveWeekStart`, `hasRegistrationOpened/Closed`). Session creation lives in `lib/sessions.ts`.
- **Exercise date:** Always Friday = `week_start + 3 days`. The `+3` is intentional.
- **Sessions open:** Tuesday 12:00 Israel time. Vercel cron (`0 10 * * 2` UTC, skips itself if too early) hits `/api/cron/open-sessions`; the dashboard/admin pages also create the week's sessions on load once the window opens (`ensureActiveWeekOpen`), so opening is on time even when the cron is late. Admin can also open manually with the "פתח השבוע" button.
- **Sessions close:** Thursday 12:00 Israel time. The signup API rejects anything after the deadline regardless of `is_open`; the cron (`0 10 * * 4` UTC) then sets `is_open = false`.
- **proxy.ts** skips `/api/*` — API routes do their own auth (crons need to reach their handler without a login cookie).
- **Signup flow:** Confirmed directly if capacity available; otherwise added to `waitlist` with a position number. In-app + email notification sent on waitlist join.
- **Cancel deadline:** Cancelling stays possible after registration closes, until Thursday midnight (`hasCancellationClosed`), so no-shows can free their spot for the waitlist.
- **Skill change lock:** Profile page blocks changing skill level while the user has a registration for the active week.
- **Blocked users:** `(app)/layout` redirects to `/login?reason=blacklisted`; proxy lets that through even when signed in, and the login page signs them out and shows a message.
- **Cancel flow:** If confirmed → spot freed, next waitlisted person is **automatically promoted to confirmed** (no user action needed). Both the promoted user and all remaining waitlisters get in-app + email notifications with updated positions.
- **No pending_confirmation:** This status was removed. Promotion is instant and automatic.
- **Who can register:** `keva` and `ezrach` service types only. מילואים / חובה have no registration path.
- **Blacklist:** Admin can block users. Blacklisted users get a 403 from the signup API.
- **Admin panel:** Shows this week's registrations per session, waitlist, and all users sorted by `total_signups`. Admin can toggle blacklist, grant/revoke admin, and manually open the week.

---

## Notifications

Two channels fire together on waitlist events:

| Event | In-app | Email |
|-------|--------|-------|
| Joined waitlist | ✅ | ✅ |
| Promoted to confirmed | ✅ | ✅ |
| Position moved up | ✅ | ✅ |

`lib/email.ts` silently no-ops if `GMAIL_USER` / `GMAIL_APP_PASSWORD` are missing (dev works without email config).
`lib/notifications.ts` catches and logs errors without throwing.

---

## Auth & Supabase Notes

- Auth: Supabase email/password. No email confirmation required (disabled in Supabase settings).
- Profile creation on register uses the **service role key** (bypasses RLS).
- Server-side Supabase client: `lib/supabase/server.ts` (cookies via `@supabase/ssr`).
- Cancel and signup APIs create a module-level admin client (`createClient` with `SUPABASE_SERVICE_ROLE_KEY`) for cross-user writes (promoting other users, notifying others).

---

## UI / Localization

- Entire UI is in **Hebrew**, RTL layout.
- Root layout sets `lang="he"` and `dir="rtl"`.
- No external UI library — plain Tailwind CSS with rounded cards, blue primary color.
- Notification bell is top-right; its dropdown opens to the **left**.
- Registration form has a "!" info button next to סוג שירות that toggles a note about who can register.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET        — Authorization header checked by both cron routes
GMAIL_USER         — Gmail address for sending notifications
GMAIL_APP_PASSWORD — Gmail App Password (16-char, not account password)
```

---

## Important Patterns

- All server page components have `export const dynamic = 'force-dynamic'` at the top.
- Dashboard filters sessions to show only the user's own skill group.
- Admin page uses Next.js Server Actions (`'use server'`) for blacklist toggle and opening sessions.
- `revalidatePath` is called after mutations to refresh page data.
- Admin client (`SUPABASE_SERVICE_ROLE_KEY`) is used for all cross-user writes; user's own `supabase` client is used for the cancelling user's own row deletions/decrements.
