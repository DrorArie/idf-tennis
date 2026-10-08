// All week/time logic for the weekly cycle, in Israel time.
// Week starts Tuesday. Registration opens Tuesday 12:00, closes Thursday 12:00.
// Exercise is Friday = week_start + 3 days.

const TZ = 'Asia/Jerusalem'
const OPEN_HOUR = 12
const CLOSE_HOUR = 12

export const WEEK_SLOTS = [
  { time_slot: '07:00:00', skill_level: 'beginner' },
  { time_slot: '08:00:00', skill_level: 'amateur' },
  { time_slot: '09:00:00', skill_level: 'expert_a' },
  { time_slot: '10:00:00', skill_level: 'expert_b' },
] as const

export const DEFAULT_CAPACITY = 8

// Current wall-clock time in Israel, as a Date whose local fields hold Israel values.
function israelNow(now = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: TZ }))
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromDateStr(s: string, addDays = 0, hour = 0): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d + addDays, hour)
}

// The Tuesday of the active week.
// Tue–Fri: the most recent Tuesday. Sat–Mon: Friday has passed, so next Tuesday.
export function getActiveWeekStart(now = new Date()): string {
  const il = israelNow(now)
  const day = il.getDay() // 0=Sun … 6=Sat
  const offset = day === 0 || day === 1 || day === 6 ? (9 - day) % 7 : -(day - 2)
  const tuesday = new Date(il.getFullYear(), il.getMonth(), il.getDate() + offset)
  return toDateStr(tuesday)
}

// Friday of the given week.
export function getExerciseDate(weekStart: string): Date {
  return fromDateStr(weekStart, 3)
}

export function hasRegistrationOpened(weekStart: string, now = new Date()): boolean {
  return israelNow(now) >= fromDateStr(weekStart, 0, OPEN_HOUR)
}

export function hasRegistrationClosed(weekStart: string, now = new Date()): boolean {
  return israelNow(now) >= fromDateStr(weekStart, 2, CLOSE_HOUR)
}

// True between Tuesday 12:00 and Thursday 12:00 of the given week.
export function isRegistrationWindow(weekStart: string, now = new Date()): boolean {
  return hasRegistrationOpened(weekStart, now) && !hasRegistrationClosed(weekStart, now)
}
