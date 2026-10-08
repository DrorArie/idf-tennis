import { after } from 'next/server'
import { createAdminClient } from '@/lib/sessions'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { SKILL_TIME, canCancel, getActiveWeekStart, registrationState } from '@/lib/week'

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

interface Notice {
  userId: string
  message: string
  subject: string
}

// Sends in-app notifications (and email, when configured) after the response is sent,
// so the person clicking never waits for them.
function notifyLater(notices: Notice[]) {
  if (notices.length === 0) return
  after(async () => {
    const admin = createAdminClient()
    const { data: profiles } = await admin
      .from('profiles').select('id, email').in('id', notices.map((n) => n.userId))
    const emailOf = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email as string | null]))
    await Promise.all(notices.map(async (n) => {
      await createNotification(admin, n.userId, n.message)
      const email = emailOf[n.userId]
      if (email) await sendEmail(email, n.subject, n.message)
    }))
  })
}

// Brings a session into a consistent state, based on signup order (created_at):
// - more confirmed than capacity (simultaneous signups, capacity lowered) → latest move to waitlist
// - free spots and people waiting → earliest waiting are promoted
// - waitlist positions renumbered 1..n
// Everyone whose status or position changed gets a notification.
export async function settleSession(sessionId: string) {
  const admin = createAdminClient()
  const [{ data: session }, { data: regs }] = await Promise.all([
    admin.from('sessions').select('capacity, time_slot').eq('id', sessionId).single(),
    admin.from('registrations')
      .select('id, user_id, status, waitlist_position, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
  ])
  if (!session || !regs) return

  const confirmed = regs.filter((r) => r.status === 'confirmed')
  let waiting = regs.filter((r) => r.status === 'waitlist')

  const demoted = confirmed.slice(session.capacity)
  const freeSpots = Math.max(0, session.capacity - confirmed.length)
  const promoted = waiting.slice(0, freeSpots)

  waiting = [...waiting.slice(freeSpots), ...demoted]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))

  const writes: PromiseLike<unknown>[] = []
  const notices: Notice[] = []
  const time = session.time_slot.slice(0, 5)

  for (const r of promoted) {
    writes.push(admin.from('registrations').update({ status: 'confirmed', waitlist_position: null }).eq('id', r.id))
    writes.push(admin.rpc('increment_total_signups', { uid: r.user_id }))
    notices.push({
      userId: r.user_id,
      subject: 'התפנה מקום — נרשמת לאימון!',
      message: `התפנה מקום! נרשמת לאימון ביום שישי בשעה ${time}.`,
    })
  }
  for (const r of demoted) writes.push(admin.rpc('decrement_total_signups', { uid: r.user_id }))

  waiting.forEach((r, i) => {
    const pos = i + 1
    const wasDemoted = r.status === 'confirmed'
    if (!wasDemoted && r.waitlist_position === pos) return
    writes.push(admin.from('registrations').update({ status: 'waitlist', waitlist_position: pos }).eq('id', r.id))
    if (wasDemoted) {
      notices.push({
        userId: r.user_id,
        subject: 'האימון התמלא',
        message: `האימון התמלא ברגע האחרון — הועברת לרשימת ההמתנה במקום #${pos}.`,
      })
    } else if (r.waitlist_position != null && pos < r.waitlist_position) {
      notices.push({
        userId: r.user_id,
        subject: 'התקדמת ברשימת ההמתנה',
        message: `התקדמת ברשימת ההמתנה — את/ה עכשיו במקום #${pos}.`,
      })
    }
  })

  await Promise.all(writes)
  notifyLater(notices)
}

async function loadSession(sessionId: string) {
  const { data } = await createAdminClient()
    .from('sessions').select('*').eq('id', sessionId).maybeSingle()
  return data
}

export async function signUp(userId: string, sessionId: string): Promise<ActionResult> {
  const admin = createAdminClient()
  const [session, { data: profile }, { data: existing }, { count }] = await Promise.all([
    loadSession(sessionId),
    admin.from('profiles').select('skill_level, is_blacklisted').eq('id', userId).maybeSingle(),
    admin.from('registrations').select('id').eq('session_id', sessionId).eq('user_id', userId).maybeSingle(),
    admin.from('registrations').select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId).eq('status', 'confirmed'),
  ])

  if (!session || !profile) return { ok: false, error: 'האימון לא נמצא' }
  if (profile.is_blacklisted) return { ok: false, error: 'החשבון חסום להרשמה. פנה למנהל.' }
  if (session.skill_level !== profile.skill_level) return { ok: false, error: 'אפשר להירשם רק לקבוצה של הרמה שלך' }
  if (registrationState(session, session.week_start) !== 'open') return { ok: false, error: 'ההרשמה לאימון הזה סגורה כרגע' }
  if (existing) return { ok: true }

  const status = (count ?? 0) < session.capacity ? 'confirmed' : 'waitlist'
  const { error } = await admin.from('registrations').insert({ session_id: sessionId, user_id: userId, status })
  if (error) {
    if (error.code === '23505') return { ok: true } // double click — already registered
    console.error('signup insert error:', error)
    return { ok: false, error: 'ההרשמה נכשלה, נסה שוב' }
  }
  if (status === 'confirmed') await admin.rpc('increment_total_signups', { uid: userId })

  // Fixes overbooking if several people grabbed the last spot at the same moment, and numbers the waitlist
  await settleSession(sessionId)

  if (status === 'waitlist') {
    const { data: mine } = await admin
      .from('registrations').select('status, waitlist_position').eq('session_id', sessionId).eq('user_id', userId).maybeSingle()
    if (mine?.status === 'waitlist') {
      notifyLater([{
        userId,
        subject: 'נרשמת לרשימת ההמתנה',
        message: `נרשמת לרשימת ההמתנה במקום #${mine.waitlist_position}. אם יתפנה מקום תירשם/י אוטומטית.`,
      }])
    }
  }
  return { ok: true }
}

async function removeRegistration(sessionId: string, userId: string, byAdmin: boolean): Promise<ActionResult> {
  const admin = createAdminClient()
  const [session, { data: reg }] = await Promise.all([
    loadSession(sessionId),
    admin.from('registrations').select('id, status').eq('session_id', sessionId).eq('user_id', userId).maybeSingle(),
  ])
  if (!session || !reg) return { ok: true } // already gone
  if (!byAdmin && !canCancel(session)) return { ok: false, error: 'האימון כבר התחיל — אי אפשר לבטל' }

  const { error } = await admin.from('registrations').delete().eq('id', reg.id)
  if (error) {
    console.error('cancel delete error:', error)
    return { ok: false, error: 'הביטול נכשל, נסה שוב' }
  }
  if (reg.status === 'confirmed') await admin.rpc('decrement_total_signups', { uid: userId })

  await settleSession(sessionId)

  if (byAdmin) {
    notifyLater([{
      userId,
      subject: 'ההרשמה שלך בוטלה',
      message: `מנהל האימונים הסיר אותך מהאימון ביום שישי בשעה ${SKILL_TIME[session.skill_level] ?? session.time_slot.slice(0, 5)}.`,
    }])
  }
  return { ok: true }
}

export const cancelRegistration = (userId: string, sessionId: string) => removeRegistration(sessionId, userId, false)
export const adminRemoveRegistration = (userId: string, sessionId: string) => removeRegistration(sessionId, userId, true)

export async function setCapacity(sessionId: string, capacity: number): Promise<ActionResult> {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 40) return { ok: false, error: 'מספר מקומות לא תקין' }
  const { error } = await createAdminClient().from('sessions').update({ capacity }).eq('id', sessionId)
  if (error) return { ok: false, error: 'השמירה נכשלה' }
  await settleSession(sessionId)
  return { ok: true }
}


// A registration for the active week is tied to the user's skill group,
// so changing level while registered would orphan it.
export async function hasActiveRegistration(userId: string) {
  const { count } = await createAdminClient()
    .from('registrations')
    .select('id, sessions!inner(week_start)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('sessions.week_start', getActiveWeekStart())
  return (count ?? 0) > 0
}
