export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth'
import { createAdminClient } from '@/lib/sessions'
import { hasActiveRegistration } from '@/lib/registrations'
import { SKILL_NAME, exerciseDay, formatLongDate, sessionStartsAt } from '@/lib/week'
import { signOutAction } from '../actions'
import ProfileForm from './ProfileForm'

interface HistoryRow {
  id: string
  status: string
  waitlist_position: number | null
  sessions: { time_slot: string; week_start: string; skill_level: string } | null
}

export default async function ProfilePage() {
  const { user, profile } = await requireMember()
  if (!profile) redirect('/dashboard')

  const [{ data }, skillLocked] = await Promise.all([
    createAdminClient()
      .from('registrations')
      .select('id, status, waitlist_position, sessions(time_slot, week_start, skill_level)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    hasActiveRegistration(user.id),
  ])
  const history = (data ?? []) as unknown as HistoryRow[]
  const now = new Date()
  const attended = history.filter(
    (r) => r.status === 'confirmed' && r.sessions && sessionStartsAt(r.sessions.week_start, r.sessions.time_slot) < now
  ).length

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-court-deep text-white p-6 court-lines animate-rise">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-ball text-court-night grid place-items-center font-bold text-3xl">
            {profile.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold truncate">{profile.name}</p>
            <p className="text-white/70 text-sm">
              {SKILL_NAME[profile.skill_level]} · {profile.service_type === 'keva' ? 'קבע' : 'אזרח עובד צה״ל'}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Stat value={profile.total_signups} label="הרשמות לאימונים" />
          <Stat value={attended} label="אימונים שהתקיימו" />
        </div>
      </section>

      <section className="rounded-[24px] bg-white border border-line p-5 animate-rise" style={{ animationDelay: '60ms' }}>
        <h2 className="text-lg font-bold mb-4">הפרטים שלי</h2>
        <ProfileForm
          name={profile.name}
          phone={profile.phone}
          email={user.email ?? ''}
          skillLevel={profile.skill_level}
          skillLocked={skillLocked}
        />
      </section>

      <section className="rounded-[24px] bg-white border border-line overflow-hidden animate-rise" style={{ animationDelay: '120ms' }}>
        <h2 className="text-lg font-bold px-5 pt-5 pb-3">ההרשמות שלי</h2>
        {history.length === 0 ? (
          <p className="text-ink-soft text-sm px-5 pb-6">עדיין לא נרשמת לאף אימון.</p>
        ) : (
          <ul>
            {history.map((r) => {
              if (!r.sessions) return null
              const past = sessionStartsAt(r.sessions.week_start, r.sessions.time_slot) < now
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line/70">
                  <div>
                    <p className="font-medium">{formatLongDate(exerciseDay(r.sessions.week_start))}</p>
                    <p className="text-xs text-ink-soft" dir="rtl">
                      {r.sessions.time_slot.slice(0, 5)} · {SKILL_NAME[r.sessions.skill_level] ?? r.sessions.skill_level}
                    </p>
                  </div>
                  <StatusPill status={r.status} position={r.waitlist_position} past={past} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <form action={signOutAction}>
        <button type="submit" className="w-full rounded-2xl border-2 border-line py-3 text-ink-soft font-medium hover:bg-white transition-colors cursor-pointer">
          התנתקות
        </button>
      </form>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 border border-white/15 px-4 py-3">
      <p className="font-display font-bold text-5xl leading-none text-ball">{value}</p>
      <p className="text-xs text-white/70 mt-1">{label}</p>
    </div>
  )
}

function StatusPill({ status, position, past }: { status: string; position: number | null; past: boolean }) {
  if (status === 'confirmed') {
    return (
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${past ? 'bg-chalk text-ink-soft' : 'bg-win/12 text-win'}`}>
        {past ? 'השתתפת' : 'רשום/ה'}
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-wait/15 text-[#a87412]">
      {past ? 'לא נכנסת' : `המתנה #${position}`}
    </span>
  )
}
