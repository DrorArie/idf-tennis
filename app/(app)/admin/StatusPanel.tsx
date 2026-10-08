import ActionButton from '@/components/ActionButton'
import { formatDateTime, type RegistrationState } from '@/lib/week'
import { closeWeekAction, openWeekAction } from './actions'

const STATE_LABEL: Record<RegistrationState, string> = {
  open: 'ההרשמה פתוחה',
  closed: 'ההרשמה סגורה',
  upcoming: 'ההרשמה טרם נפתחה',
  finished: 'האימון הסתיים',
}

interface Props {
  state: RegistrationState
  detail: string
  createdAt: string | null
  confirmed: number
  waiting: number
  free: number
  hasSessions: boolean
}

export default function StatusPanel({ state, detail, createdAt, confirmed, waiting, free, hasSessions }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-court-deep text-white p-6 court-lines">
      <div className="flex items-center gap-2.5">
        <span className="relative flex w-3 h-3">
          {state === 'open' && <span className="absolute inset-0 rounded-full bg-ball animate-ping opacity-75" />}
          <span className={`relative w-3 h-3 rounded-full ${state === 'open' ? 'bg-ball' : 'bg-white/40'}`} />
        </span>
        <p className="text-2xl font-bold">{STATE_LABEL[state]}</p>
      </div>
      <p className="text-white/70 text-sm mt-1">{detail}</p>
      {createdAt && (
        <p className="text-white/45 text-xs mt-1">השבוע נוצר במערכת {formatDateTime(new Date(createdAt))}</p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Stat value={confirmed} label="רשומים" />
        <Stat value={waiting} label="ממתינים" />
        <Stat value={free} label="מקומות פנויים" />
      </div>

      <div className="mt-5">
        {state === 'open' ? (
          <ActionButton action={closeWeekAction} variant="ghost" confirmLabel="לחיצה נוספת תסגור את ההרשמה" pendingLabel="סוגר…">
            סגירת ההרשמה עכשיו
          </ActionButton>
        ) : state !== 'finished' ? (
          <ActionButton action={openWeekAction} variant="ball" pendingLabel="פותח…">
            {hasSessions ? 'פתיחת ההרשמה מחדש' : 'פתיחת ההרשמה עכשיו'}
          </ActionButton>
        ) : null}
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 border border-white/12 py-3">
      <p className="font-display font-bold text-5xl leading-none">{value}</p>
      <p className="text-[11px] text-white/65 mt-1">{label}</p>
    </div>
  )
}
