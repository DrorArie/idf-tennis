# Registration & Waitlist Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `service_type` field to registration (קבע / אזרח עובד צה"ל), make waitlist promotion fully automatic (no confirmation step), and notify users via in-app + email when their waitlist position changes.

**Architecture:** Schema migration adds `service_type` and `email` to `profiles`, drops stale waitlist columns, and removes `pending_confirmation` from the status enum. The cancel API becomes the central place for auto-promotion and fan-out notifications. A thin `lib/email.ts` wraps Nodemailer+Gmail for email sending; `lib/notifications.ts` wraps Supabase insert for in-app notifications.

**Tech Stack:** Next.js 16 App Router, Supabase (service role for cross-user writes), Nodemailer + Gmail SMTP (free), TypeScript

---

## Files

**Create:**
- `supabase/migrations/002_service_type_and_cleanup.sql`
- `lib/email.ts`
- `lib/notifications.ts`
- `docs/superpowers/plans/2026-04-28-registration-waitlist-overhaul.md` *(this file)*

**Modify:**
- `package.json` — add `nodemailer` + `@types/nodemailer`
- `.env.local` — add `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- `app/(auth)/register/page.tsx` — add `service_type` select field
- `app/api/register/route.ts` — accept + save `service_type` and `email`
- `app/api/signup/route.ts` — remove `pending_confirmation` logic, add waitlist-join notification
- `app/api/cancel/route.ts` — auto-promote to `confirmed`, notify all affected users
- `components/SessionCard.tsx` — remove `pending_confirmation` UI (confirm button)
- `app/(app)/dashboard/page.tsx` — remove `pending_confirmation` status banner

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/002_service_type_and_cleanup.sql`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Go to the Supabase dashboard → SQL Editor → paste and run the migration file contents. Alternatively run:
```bash
npx supabase db push
```
Expected: no errors. Verify in Table Editor that `profiles` now has `service_type` and `email` columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_service_type_and_cleanup.sql docs/superpowers/plans/2026-04-28-registration-waitlist-overhaul.md
git commit -m "feat: db migration — service_type, email on profiles, remove pending_confirmation"
```

---

## Task 2: Email Utility

**Files:**
- Modify: `package.json`
- Create: `lib/email.ts`
- Modify: `.env.local`

- [ ] **Step 1: Install Nodemailer**

```bash
cd "/Users/drorarie/cludecode projects/idf-tennis" && npm install nodemailer @types/nodemailer
```

Expected: packages added to `node_modules` and `package-lock.json` updated.

- [ ] **Step 2: Add Gmail credentials to `.env.local`**

Append to `.env.local`:
```
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

To get an App Password:
1. Go to myaccount.google.com → Security → 2-Step Verification (must be enabled)
2. Search "App passwords" → create one named "IDF Tennis"
3. Copy the 16-character password

- [ ] **Step 3: Create `lib/email.ts`**

```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
})

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    await transporter.sendMail({
      from: `"IDF Tennis" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts package.json package-lock.json
git commit -m "feat: add email utility (Nodemailer + Gmail)"
```

---

## Task 3: In-App Notification Helper

**Files:**
- Create: `lib/notifications.ts`

- [ ] **Step 1: Create `lib/notifications.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  message: string,
): Promise<void> {
  await supabase.from('notifications').insert({ user_id: userId, message })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat: add createNotification helper"
```

---

## Task 4: Registration Form — Add service_type

**Files:**
- Modify: `app/(auth)/register/page.tsx`
- Modify: `app/api/register/route.ts`

- [ ] **Step 1: Update `app/(auth)/register/page.tsx`**

Add `service_type: ''` to the initial form state:
```typescript
const [form, setForm] = useState({
  name: '',
  email: '',
  phone: '',
  idf_number: '',
  skill_level: '',
  service_type: '',
  password: '',
  confirm_password: '',
})
```

Add validation before `setLoading(true)`:
```typescript
if (!form.service_type) {
  setError('יש לבחור סוג שירות')
  return
}
```

Add `service_type` to the `/api/register` fetch body:
```typescript
body: JSON.stringify({
  userId: authData.user.id,
  name: form.name,
  phone: form.phone,
  idf_number: form.idf_number,
  skill_level: form.skill_level,
  service_type: form.service_type,
  email: form.email,
}),
```

Add this JSX block after the `רמת משחק` select and before the `סיסמה` input:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">סוג שירות</label>
  <select
    required value={form.service_type}
    onChange={(e) => set('service_type', e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
  >
    <option value="">בחר סוג שירות</option>
    <option value="keva">קבע</option>
    <option value="ezrach">אזרח עובד צה"ל</option>
  </select>
</div>
```

- [ ] **Step 2: Update `app/api/register/route.ts`**

Replace the entire file with:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, name, phone, idf_number, skill_level, service_type, email } = await req.json()

  if (!userId || !name || !phone || !idf_number || !skill_level || !service_type || !email) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }

  if (!/^\d{7}$/.test(idf_number)) {
    return NextResponse.json({ error: 'מספר אישי חייב להיות 7 ספרות' }, { status: 400 })
  }

  const validLevels = ['beginner', 'amateur', 'expert_a', 'expert_b']
  if (!validLevels.includes(skill_level)) {
    return NextResponse.json({ error: 'רמת משחק לא תקינה' }, { status: 400 })
  }

  if (!['keva', 'ezrach'].includes(service_type)) {
    return NextResponse.json({ error: 'סוג שירות לא תקין' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    name,
    phone,
    idf_number,
    skill_level,
    service_type,
    email,
  })

  if (error) {
    console.error('Profile insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/register/page.tsx app/api/register/route.ts
git commit -m "feat: add service_type field to registration form and API"
```

---

## Task 5: Signup API — Remove pending_confirmation, Add Waitlist Notification

**Files:**
- Modify: `app/api/signup/route.ts`

- [ ] **Step 1: Replace `app/api/signup/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', session_id).single()
  if (!session?.is_open) return NextResponse.json({ error: 'Session not open' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('skill_level, is_blacklisted, email').eq('id', user.id).single()
  if (profile?.is_blacklisted) return NextResponse.json({ error: 'Account restricted' }, { status: 403 })
  if (session.skill_level !== profile?.skill_level) return NextResponse.json({ error: 'Skill level mismatch' }, { status: 400 })

  const { data: existing } = await supabase
    .from('registrations').select('id, status').eq('session_id', session_id).eq('user_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })

  const { data: counts } = await supabase.rpc('get_confirmed_counts', { session_ids: [session_id] })
  const confirmedCount: number = counts?.[0]?.count ?? 0

  if (confirmedCount < session.capacity) {
    await supabase.from('registrations').insert({ session_id, user_id: user.id, status: 'confirmed' })
    await supabase.rpc('increment_total_signups', { uid: user.id })
    return NextResponse.json({ status: 'confirmed' })
  }

  // Add to waitlist
  const { data: lastWaitlist } = await supabase
    .from('registrations').select('waitlist_position')
    .eq('session_id', session_id).eq('status', 'waitlist')
    .order('waitlist_position', { ascending: false }).limit(1).single()

  const nextPosition = (lastWaitlist?.waitlist_position ?? 0) + 1

  await supabase.from('registrations').insert({
    session_id, user_id: user.id, status: 'waitlist', waitlist_position: nextPosition,
  })

  const msg = `נרשמת לרשימת ההמתנה. אתה במקום #${nextPosition}.`
  await createNotification(admin, user.id, msg)
  if (profile?.email) {
    await sendEmail(profile.email, 'נרשמת לרשימת ההמתנה', msg)
  }

  return NextResponse.json({ status: 'waitlist', position: nextPosition })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/signup/route.ts
git commit -m "feat: signup API — remove pending_confirmation, notify on waitlist join"
```

---

## Task 6: Cancel API — Auto-Promote + Notify All

**Files:**
- Modify: `app/api/cancel/route.ts`

- [ ] **Step 1: Replace `app/api/cancel/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status, waitlist_position')
    .eq('session_id', session_id).eq('user_id', user.id).single()

  if (!reg) return NextResponse.json({ error: 'Not registered' }, { status: 404 })

  if (reg.status === 'confirmed') {
    // Delete the confirmed registration
    await supabase.from('registrations').delete().eq('id', reg.id)
    await supabase.rpc('decrement_total_signups', { uid: user.id })

    // Auto-promote the first person on the waitlist
    const { data: nextWaiter } = await admin
      .from('registrations')
      .select('id, user_id')
      .eq('session_id', session_id).eq('status', 'waitlist')
      .order('waitlist_position', { ascending: true })
      .limit(1).single()

    if (nextWaiter) {
      // Promote to confirmed immediately (no confirmation needed)
      await admin
        .from('registrations')
        .update({ status: 'confirmed', waitlist_position: null })
        .eq('id', nextWaiter.id)
      await admin.rpc('increment_total_signups', { uid: nextWaiter.user_id })

      const { data: promotedProfile } = await admin
        .from('profiles').select('email').eq('id', nextWaiter.user_id).single()

      const promotedMsg = 'כל הכבוד! התפנה מקום ונרשמת לאימון.'
      await createNotification(admin, nextWaiter.user_id, promotedMsg)
      if (promotedProfile?.email) {
        await sendEmail(promotedProfile.email, 'נרשמת לאימון טניס!', promotedMsg)
      }

      // Shift remaining waitlist positions down by 1 and notify each
      const { data: remaining } = await admin
        .from('registrations')
        .select('id, user_id, waitlist_position')
        .eq('session_id', session_id).eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true })

      for (const r of (remaining ?? [])) {
        const newPos = r.waitlist_position - 1
        await admin.from('registrations').update({ waitlist_position: newPos }).eq('id', r.id)

        const { data: p } = await admin
          .from('profiles').select('email').eq('id', r.user_id).single()

        const posMsg = `אתה עכשיו במקום #${newPos} ברשימת ההמתנה.`
        await createNotification(admin, r.user_id, posMsg)
        if (p?.email) await sendEmail(p.email, 'עדכון מיקום ברשימת ההמתנה', posMsg)
      }
    }
  } else if (reg.status === 'waitlist') {
    const cancelledPos = reg.waitlist_position!
    await supabase.from('registrations').delete().eq('id', reg.id)

    // Shift down everyone above the cancelled position
    const { data: toUpdate } = await admin
      .from('registrations')
      .select('id, user_id, waitlist_position')
      .eq('session_id', session_id).eq('status', 'waitlist')
      .gt('waitlist_position', cancelledPos)
      .order('waitlist_position', { ascending: true })

    for (const r of (toUpdate ?? [])) {
      const newPos = r.waitlist_position - 1
      await admin.from('registrations').update({ waitlist_position: newPos }).eq('id', r.id)

      const { data: p } = await admin
        .from('profiles').select('email').eq('id', r.user_id).single()

      const posMsg = `אתה עכשיו במקום #${newPos} ברשימת ההמתנה.`
      await createNotification(admin, r.user_id, posMsg)
      if (p?.email) await sendEmail(p.email, 'עדכון מיקום ברשימת ההמתנה', posMsg)
    }
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cancel/route.ts
git commit -m "feat: cancel API — auto-promote waitlist, notify all affected users"
```

---

## Task 7: SessionCard — Remove pending_confirmation UI

**Files:**
- Modify: `components/SessionCard.tsx`

- [ ] **Step 1: Remove `pending_confirmation` handling from `SessionCard.tsx`**

Remove the `pending_confirmation` status badge:
```tsx
// DELETE this block:
) : (
  <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
    ⚠ אשר עכשיו!
  </span>
)
```
Replace the ternary so it ends after `waitlist`:
```tsx
const statusBadge = myRegistration ? (
  myRegistration.status === 'confirmed' ? (
    <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✓ רשום</span>
  ) : (
    <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">
      המתנה #{myRegistration.waitlist_position}
    </span>
  )
) : null
```

Remove the "אשר את מקומי" confirm button block inside `myRegistration ? (...)`:
```tsx
// DELETE this:
{myRegistration.status === 'pending_confirmation' && (
  <button
    onClick={handleSignUp} disabled={loading}
    className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
  >
    {loading ? 'מאשר...' : 'אשר את מקומי'}
  </button>
)}
```

The registered-user block should now only have the cancel button:
```tsx
myRegistration ? (
  <button
    onClick={handleCancel} disabled={loading}
    className="w-full border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
  >
    {loading ? '...' : 'ביטול הרשמה'}
  </button>
) : (
  <button
    onClick={handleSignUp} disabled={loading}
    className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
  >
    {loading ? 'רגע...' : spotsLeft > 0 ? 'הרשמה' : 'הצטרפות לרשימת המתנה'}
  </button>
)
```

- [ ] **Step 2: Commit**

```bash
git add components/SessionCard.tsx
git commit -m "feat: remove pending_confirmation UI from SessionCard"
```

---

## Task 8: Dashboard — Remove pending_confirmation Banner

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Remove the `pending_confirmation` banner from `dashboard/page.tsx`**

Delete this entire block:
```tsx
{mySkillReg?.status === 'pending_confirmation' && (
  <div className="bg-orange-400 text-white rounded-2xl p-5 text-center shadow-md animate-pulse">
    <p className="text-4xl mb-2">⚠️</p>
    <p className="text-xl font-bold">יש לך מקום! אשר עכשיו</p>
    <p className="text-sm opacity-90 mt-1">לחץ על כפתור האישור למטה — יש לך שעה</p>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "feat: remove pending_confirmation banner from dashboard"
```

---

## Task 9: Push & Verify

- [ ] **Step 1: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

- [ ] **Step 2: Verify on Vercel**

Once deployed:
1. Register a new user — confirm `service_type` select appears and saves correctly
2. Sign up for a session with 8 people already confirmed — confirm waitlist join notification appears in the bell
3. Cancel a confirmed spot — confirm the next waitlisted user is automatically promoted (check Supabase registrations table)
4. Confirm email notification arrives in the Gmail inbox

