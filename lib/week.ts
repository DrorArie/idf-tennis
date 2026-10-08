// All week/time logic for the weekly cycle, in Israel time.
// Week starts Tuesday. Registration opens Tuesday 12:00, closes Thursday 12:00.
// Exercise is Friday = week_start + 3 days.

export const TZ = 'Asia/Jerusalem'

export const WEEK_SLOTS = [
  { time_slot: '07:00:00', skill_level: 'beginner' },
  { time_slot: '08:00:00', skill_level: 'amateur' },
  { time_slot: '09:00:00', skill_level: 'expert_a' },
  { time_slot: '10:00:00', skill_level: 'expert_b' },
] as const

export const DEFAULT_CAPACITY = 8

export const SKILL_NAME: Record<string, string> = {
  beginner: 'מתחילים',
  amateur: 'חובבנים',
  expert_a: 'מתקדמים א׳',
  expert_b: 'מתקדמים ב׳',
}

export const SKILL_TIME: Record<string, string> = {
  beginner: '07:00',
  amateur: '08:00',
  expert_a: '09:00',
  expert_b: '10:00',
}

// Current wall-clock time in Israel, as a Date whose local fields hold Israel values.
function israelWall(now: Date): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: TZ }))
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// The real moment of an Israel wall-clock time (handles summer/winter time).
function israelInstant(weekStart: string, addDays: number, hour: number, minute = 0): Date {
  const [y, m, d] = weekStart.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d + addDays, hour, minute))
  const asIsrael = new Date(guess.toLocaleString('en-US', { timeZone: TZ }))
  const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }))
  return new Date(guess.getTime() - (asIsrael.getTime() - asUtc.getTime()))
}

// The Tuesday of the active week.
// Tue–Fri: the most recent Tuesday. Sat–Mon: Friday has passed, so next Tuesday.
export function getActiveWeekStart(now = new Date()): string {
  const il = israelWall(now)
  const day = il.getDay() // 0=Sun … 6=Sat
  const offset = day === 0 || day === 1 || day === 6 ? (9 - day) % 7 : -(day - 2)
  return toDateStr(new Date(il.getFullYear(), il.getMonth(), il.getDate() + offset))
}

export const opensAt = (weekStart: string) => israelInstant(weekStart, 0, 12)
export const closesAt = (weekStart: string) => israelInstant(weekStart, 2, 12)
export const exerciseDay = (weekStart: string) => israelInstant(weekStart, 3, 12)

export function sessionStartsAt(weekStart: string, timeSlot: string): Date {
  const [h, m] = timeSlot.split(':').map(Number)
  return israelInstant(weekStart, 3, h, m)
}

// True between Tuesday 12:00 and Thursday 12:00 of the given week.
export function isRegistrationWindow(weekStart: string, now = new Date()): boolean {
  return now >= opensAt(weekStart) && now < closesAt(weekStart)
}

export interface SessionTiming {
  week_start: string
  time_slot: string
  is_open: boolean
  closes_at?: string | null
}

export type RegistrationState = 'upcoming' | 'open' | 'closed' | 'finished'

// The single source of truth for whether a session accepts signups.
// is_open is the switch; closes_at (when set) is the automatic deadline.
export function registrationState(session: SessionTiming | null | undefined, weekStart: string, now = new Date()): RegistrationState {
  if (!session) return now < opensAt(weekStart) ? 'upcoming' : 'closed'
  if (now >= sessionStartsAt(session.week_start, session.time_slot)) return 'finished'
  const deadlinePassed = !!session.closes_at && now >= new Date(session.closes_at)
  if (session.is_open && !deadlinePassed) return 'open'
  return now < opensAt(session.week_start) ? 'upcoming' : 'closed'
}

// Cancelling is allowed until the session starts — a late cancel still lets a waitlister in.
export function canCancel(session: SessionTiming, now = new Date()): boolean {
  return now < sessionStartsAt(session.week_start, session.time_slot)
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('he-IL', { timeZone: TZ, ...opts })

export const formatLongDate = (d: Date) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d)
export const formatShortDate = (d: Date) => fmt({ day: 'numeric', month: 'numeric' }).format(d)
export const formatDayTime = (d: Date) => fmt({ weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(d)
const weekdayFmt = fmt({ weekday: 'long' })
const timeFmt = fmt({ hour: '2-digit', minute: '2-digit' })
// For use inside sentences: "ביום חמישי ב־12:00"
export const formatWhen = (d: Date) => `ב${weekdayFmt.format(d)} ב־${timeFmt.format(d)}`
export const formatDateTime = (d: Date) =>
  fmt({ weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
