export const dynamic = 'force-dynamic'

import { requireMember } from '@/lib/auth'
import { createAdminClient, ensureActiveWeekOpen } from '@/lib/sessions'
import {
  SKILL_TIME, exerciseDay, formatLongDate, getActiveWeekStart, isRegistrationWindow, registrationState,
} from '@/lib/week'
import { CourtCard, StatusCard, WeekTimeline, type SessionRow } from './parts'
import CompleteProfile from './CompleteProfile'

async function loadWeek(weekStart: string) {
  const { data } = await createAdminClient()
    .from('sessions').select('*').eq('week_start', weekStart).order('time_slot')
  return (data ?? []) as SessionRow[]
}

export default async function DashboardPage() {
  const { user, profile } = await requireMember()
  if (!profile) return <CompleteProfile email={user.email ?? ''} />

  const weekStart = getActiveWeekStart()
  let sessions = await loadWeek(weekStart)
  // Safety net: open the week on time even if the scheduled job hasn't run yet
  if (sessions.length === 0 && isRegistrationWindow(weekStart)) {
    await ensureActiveWeekOpen()
    sessions = await loadWeek(weekStart)
  }

  const session = sessions.find((s) => s.skill_level === profile.skill_level) ?? null
  const { data: regs } = session
    ? await createAdminClient()
        .from('registrations').select('user_id, status, waitlist_position').eq('session_id', session.id)
    : { data: [] }

  const confirmed = (regs ?? []).filter((r) => r.status === 'confirmed').length
  const waiting = (regs ?? []).filter((r) => r.status === 'waitlist').length
  const mine = (regs ?? []).find((r) => r.user_id === user.id) ?? null
  const state = registrationState(session, weekStart)
  const capacity = session?.capacity ?? 8
  const time = session?.time_slot.slice(0, 5) ?? SKILL_TIME[profile.skill_level]
  const firstName = profile.name.split(' ')[0]

  return (
    <div className="space-y-5">
      <p className="text-ink-soft animate-rise">
        שלום <span className="font-semibold text-ink">{firstName}</span>
      </p>

      <div className="animate-rise" style={{ animationDelay: '60ms' }}>
        <CourtCard
          dateLabel={formatLongDate(exerciseDay(weekStart))}
          time={time}
          skill={profile.skill_level}
          stats={session ? { confirmed, capacity, waiting } : null}
        />
      </div>

      <div className="animate-rise" style={{ animationDelay: '120ms' }}>
        <StatusCard
          state={state}
          session={session}
          mine={mine}
          spotsLeft={Math.max(0, capacity - confirmed)}
          waiting={waiting}
          weekStart={weekStart}
        />
      </div>

      <div className="animate-rise" style={{ animationDelay: '180ms' }}>
        <WeekTimeline weekStart={weekStart} session={session} state={state} />
      </div>
    </div>
  )
}

