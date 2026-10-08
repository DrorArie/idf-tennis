'use client'
import { useState, useTransition } from 'react'
import ActionButton from '@/components/ActionButton'
import { SKILL_NAME } from '@/lib/week'
import { removeParticipantAction, setCapacityAction } from './actions'

export interface Person {
  user_id: string
  status: string
  waitlist_position: number | null
  profiles: { name: string; phone: string; total_signups: number } | null
}

interface Props {
  session: { id: string; time: string; skill: string; capacity: number }
  dateLabel: string
  people: Person[]
}

export default function GroupCard({ session, dateLabel, people }: Props) {
  const confirmed = people.filter((p) => p.status === 'confirmed')
  const waiting = people
    .filter((p) => p.status === 'waitlist')
    .sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0))
  const [copied, setCopied] = useState(false)
  const [capPending, startCap] = useTransition()
  const [capError, setCapError] = useState('')

  function changeCapacity(delta: number) {
    const next = session.capacity + delta
    if (next < 1) return
    setCapError('')
    startCap(async () => {
      const res = await setCapacityAction(session.id, next)
      if (!res.ok) setCapError(res.error)
    })
  }

  async function copyList() {
    const lines = [
      `🎾 ${SKILL_NAME[session.skill]} · ${session.time} · ${dateLabel}`,
      '',
      ...confirmed.map((p, i) => `${i + 1}. ${p.profiles?.name ?? ''} ${p.profiles?.phone ?? ''}`.trim()),
    ]
    if (waiting.length) {
      lines.push('', 'רשימת המתנה:', ...waiting.map((p) => `${p.waitlist_position}. ${p.profiles?.name ?? ''}`))
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCapError('ההעתקה נכשלה')
    }
  }

  const full = confirmed.length >= session.capacity

  return (
    <div className="rounded-[24px] bg-white border border-line overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <p className="font-display font-bold text-5xl leading-none text-court-deep w-24 shrink-0" dir="ltr">{session.time}</p>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{SKILL_NAME[session.skill]}</p>
          <p className={`text-sm ${full ? 'text-fault font-medium' : 'text-ink-soft'}`}>
            {confirmed.length}/{session.capacity} רשומים{waiting.length > 0 && ` · ${waiting.length} ממתינים`}
          </p>
        </div>
        <button
          onClick={copyList}
          className="text-xs font-medium px-3 py-2 rounded-xl bg-chalk hover:bg-line transition-colors cursor-pointer"
        >
          {copied ? 'הועתק ✓' : 'העתקת רשימה'}
        </button>
      </div>

      <div className="flex gap-1 px-4" aria-hidden="true">
        {Array.from({ length: session.capacity }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < confirmed.length ? 'bg-court' : 'bg-line'}`} />
        ))}
      </div>

      <ul className="mt-3">
        {confirmed.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft border-t border-line/70">אין רשומים עדיין</li>}
        {confirmed.map((p, i) => (
          <PersonRow key={p.user_id} person={p} index={`${i + 1}`} sessionId={session.id} />
        ))}
      </ul>

      {waiting.length > 0 && (
        <>
          <p className="px-4 py-2 text-xs font-semibold text-[#a87412] bg-wait/10 border-t border-wait/20">רשימת המתנה</p>
          <ul>
            {waiting.map((p) => (
              <PersonRow key={p.user_id} person={p} index={`#${p.waitlist_position}`} sessionId={session.id} waiting />
            ))}
          </ul>
        </>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-chalk/60 border-t border-line">
        <span className="text-sm text-ink-soft">מקומות באימון</span>
        <div className="flex items-center gap-2" dir="ltr">
          <StepButton onClick={() => changeCapacity(-1)} disabled={capPending || session.capacity <= 1} label="−" />
          <span className={`w-8 text-center font-bold text-xl tabular-nums ${capPending ? 'opacity-40' : ''}`}>{session.capacity}</span>
          <StepButton onClick={() => changeCapacity(1)} disabled={capPending} label="+" />
        </div>
      </div>
      {capError && <p className="px-4 pb-3 text-sm text-fault bg-chalk/60">{capError}</p>}
    </div>
  )
}

function StepButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-xl bg-white border-2 border-line text-lg font-bold hover:border-court disabled:opacity-40 transition-colors cursor-pointer"
    >
      {label}
    </button>
  )
}

function PersonRow({ person, index, sessionId, waiting = false }: { person: Person; index: string; sessionId: string; waiting?: boolean }) {
  const phone = person.profiles?.phone ?? ''
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 border-t border-line/70 ${waiting ? 'bg-wait/5' : ''}`}>
      <span className="w-7 text-sm text-ink-soft tabular-nums" dir="ltr">{index}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{person.profiles?.name}</p>
        {phone && (
          <a href={`tel:${phone}`} className="text-xs text-court hover:underline" dir="ltr">{phone}</a>
        )}
      </div>
      <span className="text-xs text-ink-soft">{person.profiles?.total_signups ?? 0} אימונים</span>
      <ActionButton
        action={removeParticipantAction.bind(null, person.user_id, sessionId)}
        variant="quiet"
        size="sm"
        confirmLabel="להסיר?"
        pendingLabel="…"
      >
        הסרה
      </ActionButton>
    </li>
  )
}
