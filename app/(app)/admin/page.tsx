export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient, ensureActiveWeekOpen } from '@/lib/sessions'
import {
  closesAt, exerciseDay, formatLongDate, formatWhen, getActiveWeekStart,
  isRegistrationWindow, opensAt, registrationState,
} from '@/lib/week'
import StatusPanel from './StatusPanel'
import GroupCard, { type Person } from './GroupCard'
import UserList, { type UserRow } from './UserList'

interface SessionRow {
  id: string
  week_start: string
  time_slot: string
  skill_level: string
  capacity: number
  is_open: boolean
  created_at: string
  closes_at?: string | null
}


async function loadWeek(weekStart: string) {
  const { data } = await createAdminClient()
    .from('sessions').select('*').eq('week_start', weekStart).order('time_slot')
  return (data ?? []) as SessionRow[]
}

export default async function AdminPage() {
  const { profile: me } = await requireAdmin()
  const admin = createAdminClient()
  const weekStart = getActiveWeekStart()

  const [initialSessions, { data: users }] = await Promise.all([
    loadWeek(weekStart),
    admin.from('profiles')
      .select('id, name, phone, email, skill_level, service_type, total_signups, is_blacklisted, is_admin')
      .order('total_signups', { ascending: false }),
  ])
  let sessions = initialSessions
  if (sessions.length === 0 && isRegistrationWindow(weekStart)) {
    await ensureActiveWeekOpen()
    sessions = await loadWeek(weekStart)
  }

  const { data: regs } = sessions.length
    ? await admin
        .from('registrations')
        .select('session_id, user_id, status, waitlist_position, created_at, profiles(name, phone, total_signups)')
        .in('session_id', sessions.map((s) => s.id))
        .order('created_at', { ascending: true })
    : { data: [] }

  const people = (regs ?? []) as unknown as (Person & { session_id: string })[]
  const state = registrationState(sessions[0], weekStart)
  const confirmedTotal = people.filter((p) => p.status === 'confirmed').length
  const waitingTotal = people.filter((p) => p.status === 'waitlist').length
  const capacityTotal = sessions.reduce((n, s) => n + s.capacity, 0)
  const needsMigration = sessions.length > 0 && !('closes_at' in sessions[0])
  const manualOpen = state === 'open' && sessions[0]?.closes_at === null
  const deadline = sessions[0]?.closes_at ? new Date(sessions[0].closes_at) : closesAt(weekStart)

  let detail: string
  if (state === 'open') detail = manualOpen ? 'נפתחה ידנית — פתוחה עד שתסגור' : `נסגרת אוטומטית ${formatWhen(deadline)}`
  else if (state === 'upcoming') detail = `נפתחת אוטומטית ${formatWhen(opensAt(weekStart))}`
  else if (state === 'closed') detail = 'אפשר לפתוח מחדש ידנית — תישאר פתוחה עד שתסגור'
  else detail = 'השבוע הבא ייפתח ביום שלישי ב־12:00'

  return (
    <div className="space-y-5">
      <div className="animate-rise">
        <h1 className="font-display font-bold text-5xl leading-none text-court-deep">לוח ניהול</h1>
        <p className="text-ink-soft mt-1">אימון {formatLongDate(exerciseDay(weekStart))}</p>
      </div>

      {needsMigration && (
        <div className="rounded-2xl bg-wait/15 border border-wait/40 px-4 py-3 text-sm animate-rise">
          <p className="font-semibold">נדרש עדכון קטן למסד הנתונים</p>
          <p className="text-ink-soft">בלי העדכון ההרשמה לא תיסגר אוטומטית בחמישי. הרץ את הקובץ 005 ב־Supabase SQL Editor.</p>
        </div>
      )}

      <div className="animate-rise" style={{ animationDelay: '60ms' }}>
        <StatusPanel
          state={state}
          detail={detail}
          createdAt={sessions[0]?.created_at ?? null}
          confirmed={confirmedTotal}
          waiting={waitingTotal}
          free={Math.max(0, capacityTotal - confirmedTotal)}
          hasSessions={sessions.length > 0}
        />
      </div>

      {/* Groups */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">קבוצות</h2>
        {sessions.length === 0 ? (
          <p className="rounded-[24px] bg-white border border-line p-6 text-center text-ink-soft">
            האימונים לשבוע הזה עדיין לא נוצרו.
          </p>
        ) : (
          sessions.map((s, i) => (
            <div key={s.id} className="animate-rise" style={{ animationDelay: `${120 + i * 50}ms` }}>
              <GroupCard
                session={{ id: s.id, time: s.time_slot.slice(0, 5), skill: s.skill_level, capacity: s.capacity }}
                dateLabel={formatLongDate(exerciseDay(weekStart))}
                people={people.filter((p) => p.session_id === s.id)}
              />
            </div>
          ))
        )}
      </section>

      {/* Users */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">משתתפים ({(users ?? []).length})</h2>
        <UserList users={(users ?? []) as UserRow[]} myId={me!.id} />
      </section>
    </div>
  )
}
