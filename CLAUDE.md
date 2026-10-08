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
  (app)/           — authenticated routes (layout awaits nothing; user bits stream in via Suspense)
    actions.ts     — member server actions: signUp, cancel, updateProfile, completeProfile, signOut
    dashboard/     — page.tsx (data) + parts.tsx (CourtCard, StatusCard, WeekTimeline) + CompleteProfile
    admin/         — page.tsx + actions.ts (open/close week, remove participant, capacity, block/admin)
                     + StatusPanel, GroupCard, UserList client components
    profile/       — page.tsx + ProfileForm
    */loading.tsx  — skeletons so tab switches are instant
  (auth)/          — login, register, forgot-password, reset-password
  api/
    register/      — POST: creates profile for the just-signed-up (signed-in) user
    cron/open-sessions, cron/close-sessions — Vercel crons (CRON_SECRET)
components/        — ActionButton (pending + tap-twice confirm), Form (Field/Select/SubmitButton),
                     BottomNav, NotificationBell, Logo, TennisBall
lib/
  week.ts          — ALL time logic: getActiveWeekStart, opensAt/closesAt, registrationState, canCancel, Hebrew formatters
  sessions.ts      — createAdminClient, ensureActiveWeekOpen, adminOpenWeek, closeWeek
  registrations.ts — signUp, cancel, admin remove, setCapacity, settleSession (waitlist engine), notifications via after()
  auth.ts          — cached getUser/getProfile, requireMember/requireAdmin, currentAdmin
supabase/migrations/ — 001–003 schema history, 004 protect is_admin/is_blacklisted/total_signups,
                       005 sessions.closes_at + lock down notifications insert & signup counter RPCs
```

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

- **Week start:** active week's Tuesday (Israel time); Sat–Mon already points to next Tuesday. Exercise = Friday (week_start + 3).
- **Registration state** (`registrationState` in lib/week.ts) is the single source of truth: open iff `is_open` and (`closes_at` null or in the future). Also 'upcoming' / 'closed' / 'finished'.
- **Auto open:** Tuesday 12:00 — dashboard/admin page loads (and the cron, `0 10 * * 2` UTC) create the week with `closes_at` = Thursday 12:00. Existing rows are never overwritten.
- **Admin open:** before the deadline keeps Thursday 12:00; after it sets `closes_at = null` → open until the admin closes. Admin close sets `is_open = false`.
- **Close cron** (`0 10 * * 4`) only flips `is_open` for rows whose `closes_at` passed (display only; signups already stop at closes_at).
- **settleSession:** after every signup/cancel/removal/capacity change — orders by created_at, demotes overbooked (race at 12:00 rush), promotes waitlisters into free spots, renumbers waitlist 1..n, notifies changed users. All writes use the service-role client after the caller is verified.
- **Cancel:** allowed until the session starts. **Skill change** blocked while registered for the active week.
- **Blocked users:** redirected to `/login?reason=blacklisted` (proxy lets it through), login page signs them out.
- **proxy.ts** skips `/api/*` (crons must reach their handler without a login cookie).
- Fonts: Rubik (body) + Karantina (display numbers/headlines), both with Hebrew. Theme tokens in globals.css (`court`, `ball`, `chalk`, `ink`…).

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
