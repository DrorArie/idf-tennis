export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SessionCard from '@/components/SessionCard'

function getThisWeekTuesday(): string {
  const now = new Date()
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const day = israelTime.getDay()
  const daysUntilTuesday = (2 - day + 7) % 7
  const tuesday = new Date(israelTime)
  tuesday.setDate(israelTime.getDate() + daysUntilTuesday)
  return tuesday.toISOString().split('T')[0]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('skill_level').eq('id', user.id).single()

  const weekStart = getThisWeekTuesday()

  const { data: sessions } = await supabase
    .from('sessions').select('*').eq('week_start', weekStart).order('time_slot')

  const sessionIds = (sessions ?? []).map((s) => s.id)

  const { data: myRegistrations } = await supabase
    .from('registrations')
    .select('session_id, status, waitlist_position')
    .eq('user_id', user.id)
    .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000'])

  const countMap: Record<string, number> = {}
  if (sessionIds.length > 0) {
    const { data: counts } = await supabase.rpc('get_confirmed_counts', { session_ids: sessionIds })
    ;(counts ?? []).forEach((c: { session_id: string; count: number }) => {
      countMap[c.session_id] = c.count
    })
  }

  const myRegMap = Object.fromEntries((myRegistrations ?? []).map((r) => [r.session_id, r]))

  const weekDateStr = new Date(weekStart + 'T00:00:00').toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">אימוני השבוע</h2>
        <p className="text-sm text-gray-500">שבוע של {weekDateStr}</p>
      </div>

      {(sessions ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🎾</p>
          <p className="text-gray-600 font-medium">עדיין אין אימונים השבוע</p>
          <p className="text-sm text-gray-400 mt-1">המקומות נפתחים אוטומטית כל יום שלישי בשעה 12:00</p>
        </div>
      ) : (
        (sessions ?? []).map((session) => (
          <SessionCard
            key={session.id}
            session={{ ...session, confirmed_count: countMap[session.id] ?? 0 }}
            myRegistration={myRegMap[session.id] ?? null}
            userSkillLevel={profile?.skill_level ?? ''}
          />
        ))
      )}
    </div>
  )
}
