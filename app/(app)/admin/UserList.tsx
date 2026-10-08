'use client'
import { useMemo, useState } from 'react'
import ActionButton from '@/components/ActionButton'
import { SKILL_NAME } from '@/lib/week'
import { setUserFlagAction } from './actions'

export interface UserRow {
  id: string
  name: string
  phone: string
  email: string | null
  skill_level: string
  service_type: string
  total_signups: number
  is_blacklisted: boolean
  is_admin: boolean
}

const FILTERS = [
  { key: 'all', label: 'כולם' },
  { key: 'admins', label: 'מנהלים' },
  { key: 'blocked', label: 'חסומים' },
] as const

export default function UserList({ users, myId }: { users: UserRow[]; myId: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (filter === 'admins' && !u.is_admin) return false
      if (filter === 'blocked' && !u.is_blacklisted) return false
      if (!q) return true
      return [u.name, u.phone, u.email ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [users, query, filter])

  return (
    <div className="rounded-[24px] bg-white border border-line overflow-hidden">
      <div className="p-3 space-y-2 border-b border-line">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או אימייל"
          className="w-full rounded-xl border-2 border-line bg-chalk/50 px-4 py-2.5 outline-none focus:border-court focus:bg-white transition-colors"
        />
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                filter === f.key ? 'bg-court text-white' : 'bg-chalk text-ink-soft hover:bg-line'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && <p className="p-6 text-center text-sm text-ink-soft">לא נמצאו משתתפים</p>}

      <ul>
        {shown.map((u) => {
          const open = openId === u.id
          return (
            <li key={u.id} className={`border-b border-line/70 last:border-0 ${u.is_blacklisted ? 'bg-fault/5' : ''}`}>
              <button
                onClick={() => setOpenId(open ? null : u.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl bg-chalk grid place-items-center font-bold text-court-deep shrink-0">
                  {u.name.charAt(0)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{u.name}</span>
                    {u.is_admin && <Badge className="bg-court/10 text-court">מנהל</Badge>}
                    {u.is_blacklisted && <Badge className="bg-fault/10 text-fault">חסום</Badge>}
                  </span>
                  <span className="block text-xs text-ink-soft">{SKILL_NAME[u.skill_level] ?? u.skill_level}</span>
                </span>
                <span className="text-sm font-semibold text-court tabular-nums">{u.total_signups}</span>
                <svg className={`w-4 h-4 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1 1l5 5 5-5" />
                </svg>
              </button>

              {open && (
                <div className="px-4 pb-4 -mt-1 space-y-3 animate-rise">
                  <div className="text-sm space-y-1 text-ink-soft">
                    <p>טלפון: <a href={`tel:${u.phone}`} className="text-court" dir="ltr">{u.phone}</a></p>
                    {u.email && <p>אימייל: <span dir="ltr">{u.email}</span></p>}
                    <p>שירות: {u.service_type === 'keva' ? 'קבע' : 'אזרח עובד צה״ל'} · {u.total_signups} הרשמות</p>
                  </div>
                  {u.id !== myId && (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        action={setUserFlagAction.bind(null, u.id, 'is_blacklisted', !u.is_blacklisted)}
                        variant="quiet"
                        size="sm"
                        confirmLabel={u.is_blacklisted ? 'לבטל חסימה?' : 'לחסום?'}
                        pendingLabel="…"
                      >
                        {u.is_blacklisted ? 'ביטול חסימה' : 'חסימה'}
                      </ActionButton>
                      <ActionButton
                        action={setUserFlagAction.bind(null, u.id, 'is_admin', !u.is_admin)}
                        variant="quiet"
                        size="sm"
                        confirmLabel={u.is_admin ? 'להסיר הרשאת מנהל?' : 'להפוך למנהל?'}
                        pendingLabel="…"
                      >
                        {u.is_admin ? 'הסרת הרשאת מנהל' : 'הפיכה למנהל'}
                      </ActionButton>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${className}`}>{children}</span>
}
