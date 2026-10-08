import ActionButton from '@/components/ActionButton'
import TennisBall from '@/components/TennisBall'
import {
  SKILL_NAME, canCancel, closesAt, formatDayTime, formatWhen, opensAt, sessionStartsAt, type RegistrationState,
} from '@/lib/week'
import { cancelAction, signUpAction } from '../actions'

export interface SessionRow {
  id: string
  week_start: string
  time_slot: string
  skill_level: string
  capacity: number
  is_open: boolean
  closes_at?: string | null
}

export function CourtMarkings() {
  return (
    <div className="absolute inset-3 rounded-[18px] border-2 border-white/20 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-x-0 top-[58%] border-t-2 border-white/20" />
      <div className="absolute left-1/2 top-0 h-[58%] border-l-2 border-white/20" />
      <div className="absolute inset-y-0 right-[12%] border-r-2 border-white/10" />
      <div className="absolute inset-y-0 left-[12%] border-l-2 border-white/10" />
    </div>
  )
}

export function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
  return (
    <div className="mt-5 flex gap-1.5" dir="rtl" aria-label={`${confirmed} מתוך ${capacity} מקומות תפוסים`}>
      {Array.from({ length: capacity }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 rounded-full ${i < confirmed ? 'bg-ball' : 'bg-white/20'}`}
        />
      ))}
    </div>
  )
}

export function StatusCard({
  state, session, mine, spotsLeft, waiting, weekStart,
}: {
  state: RegistrationState
  session: SessionRow | null
  mine: { status: string; waitlist_position: number | null } | null
  spotsLeft: number
  waiting: number
  weekStart: string
}) {
  const card = 'rounded-[24px] bg-white border border-line p-5'

  if (session && mine?.status === 'confirmed') {
    return (
      <div className={`${card} border-win/30`}>
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-win text-white grid place-items-center text-3xl animate-pop">✓</span>
          <div>
            <p className="text-xl font-bold">את/ה רשום/ה לאימון</p>
            <p className="text-ink-soft text-sm">נתראה במגרש! אם משהו משתנה — בטל/י כדי לפנות מקום.</p>
          </div>
        </div>
        {canCancel(session) && (
          <div className="mt-4">
            <ActionButton action={cancelAction.bind(null, session.id)} variant="danger" confirmLabel="לחיצה נוספת תבטל את ההרשמה" pendingLabel="מבטל…">
              ביטול הרשמה
            </ActionButton>
          </div>
        )}
      </div>
    )
  }

  if (session && mine?.status === 'waitlist') {
    return (
      <div className={`${card} border-wait/40`}>
        <div className="flex items-center gap-4">
          <span className="min-w-14 h-14 px-2 rounded-2xl bg-wait text-white grid place-items-center font-display font-bold text-4xl animate-pop" dir="ltr">
            #{mine.waitlist_position}
          </span>
          <div>
            <p className="text-xl font-bold">ברשימת ההמתנה</p>
            <p className="text-ink-soft text-sm">אם יתפנה מקום תירשם/י אוטומטית ותקבל/י התראה.</p>
          </div>
        </div>
        {canCancel(session) && (
          <div className="mt-4">
            <ActionButton action={cancelAction.bind(null, session.id)} variant="quiet" confirmLabel="לחיצה נוספת תוציא אותך מהרשימה" pendingLabel="יוצא…">
              יציאה מרשימת ההמתנה
            </ActionButton>
          </div>
        )}
      </div>
    )
  }

  if (session && state === 'open') {
    const full = spotsLeft === 0
    return (
      <div className={card}>
        <p className="text-ink-soft text-sm mb-1">{full ? `כל המקומות תפוסים${waiting > 0 ? ` · ${waiting} ממתינים` : ''}` : 'ההרשמה פתוחה'}</p>
        <p className="text-2xl font-bold mb-4">
          {full ? 'האימון מלא' : spotsLeft === 1 ? 'נשאר מקום אחרון!' : `נשארו ${spotsLeft} מקומות`}
        </p>
        <ActionButton action={signUpAction.bind(null, session.id)} variant={full ? 'primary' : 'ball'} pendingLabel="נרשם…">
          {full ? 'הצטרפות לרשימת המתנה' : 'הרשמה לאימון'}
        </ActionButton>
        {session.closes_at && (
          <p className="text-xs text-ink-soft mt-3 text-center">ההרשמה נסגרת {formatWhen(new Date(session.closes_at))}</p>
        )}
      </div>
    )
  }

  if (state === 'upcoming') {
    return (
      <div className={`${card} flex items-center gap-4`}>
        <TennisBall className="w-12 h-12 shrink-0 animate-bounce-ball" />
        <div>
          <p className="text-xl font-bold">ההרשמה עוד לא נפתחה</p>
          <p className="text-ink-soft text-sm">היא תיפתח {formatWhen(opensAt(weekStart))}.</p>
        </div>
      </div>
    )
  }

  if (state === 'finished') {
    return (
      <div className={card}>
        <p className="text-xl font-bold">האימון של השבוע הסתיים</p>
        <p className="text-ink-soft text-sm">ההרשמה לשבוע הבא תיפתח ביום שלישי ב־12:00.</p>
      </div>
    )
  }

  return (
    <div className={card}>
      <p className="text-xl font-bold">ההרשמה לאימון הזה נסגרה</p>
      <p className="text-ink-soft text-sm">ההרשמה לשבוע הבא תיפתח ביום שלישי ב־12:00.</p>
    </div>
  )
}

export function WeekTimeline({ weekStart, session, state }: { weekStart: string; session: SessionRow | null; state: RegistrationState }) {
  const now = new Date()
  const manualOpen = session?.is_open && session.closes_at === null && state === 'open'
  const start = sessionStartsAt(weekStart, session?.time_slot ?? '07:00:00')
  const steps = [
    { label: 'פתיחת הרשמה', when: formatDayTime(opensAt(weekStart)), done: now >= opensAt(weekStart) || state === 'open' },
    {
      label: 'סגירת הרשמה',
      when: manualOpen ? 'פתוחה עד שהמנהל יסגור' : formatDayTime(session?.closes_at ? new Date(session.closes_at) : closesAt(weekStart)),
      done: state === 'closed' || state === 'finished',
    },
    { label: 'אימון', when: formatDayTime(start), done: state === 'finished' },
  ]
  const current = steps.findIndex((s) => !s.done)

  return (
    <ol className="rounded-[24px] bg-white border border-line px-5 py-4">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex items-center gap-3 py-2">
          {i < steps.length - 1 && (
            <span className={`absolute right-[7px] top-7 h-[calc(100%-12px)] w-0.5 ${s.done ? 'bg-court' : 'bg-line'}`} />
          )}
          <span
            className={`relative w-4 h-4 rounded-full shrink-0 border-2 ${
              s.done ? 'bg-court border-court' : i === current ? 'bg-ball border-court' : 'bg-white border-line'
            }`}
          />
          <span className={`flex-1 ${i === current ? 'font-semibold' : s.done ? 'text-ink-soft' : ''}`}>{s.label}</span>
          <span className="text-sm text-ink-soft">{s.when}</span>
        </li>
      ))}
    </ol>
  )
}

export function CourtCard({
  dateLabel, time, skill, stats,
}: {
  dateLabel: string
  time: string
  skill: string
  stats: { confirmed: number; capacity: number; waiting: number } | null
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-court text-white p-6 pb-5 shadow-xl shadow-court/25">
      <CourtMarkings />
      <TennisBall className="absolute -left-5 -top-5 w-24 h-24 opacity-95 rotate-12" />

      <div className="relative">
        <p className="text-ball text-sm font-semibold tracking-wide">האימון הקרוב</p>
        <p className="mt-1 text-white/85">{dateLabel}</p>

        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="font-display font-bold text-[96px] leading-[0.8] tracking-tight" dir="ltr">{time}</p>
            <p className="mt-3 text-lg font-medium">קבוצת {SKILL_NAME[skill]}</p>
          </div>
          {stats && (
            <div className="text-left shrink-0" dir="ltr">
              <p className="font-display font-bold text-6xl leading-none">
                {stats.confirmed}<span className="text-white/45">/{stats.capacity}</span>
              </p>
              <p className="text-xs text-white/70 mt-1 text-right" dir="rtl">
                רשומים{stats.waiting > 0 && ` · ${stats.waiting} ממתינים`}
              </p>
            </div>
          )}
        </div>

        {stats && <CapacityBar confirmed={stats.confirmed} capacity={stats.capacity} />}
      </div>
    </section>
  )
}
