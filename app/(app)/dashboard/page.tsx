export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SessionCard from '@/components/SessionCard'

const SKILL_LABEL: Record<string, string> = {
  beginner: 'מתחילים (7:00)',
  amateur: 'חובבנים (8:00)',
  expert_a: 'מתקדמים א׳ (9:00)',
  expert_b: 'מתקדמים ב׳ (10:00)',
}

// Returns the most recent past Tuesday (or today if today is Tuesday)
function getThisWeekTuesday(): string {
  const now = new Date()
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const day = israelTime.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const daysSinceTuesday = (day - 2 + 7) % 7
  const tuesday = new Date(israelTime)
  tuesday.setDate(israelTime.getDate() - daysSinceTuesday)
  const y = tuesday.getFullYear()
  const m = String(tuesday.getMonth() + 1).padStart(2, '0')
  const d = String(tuesday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Exercise is always Friday = Tuesday + 3 days
function getExerciseDate(weekStart: string): Date {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d + 3)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('skill_level').eq('id', user.id).single()

  const weekStart = getThisWeekTuesday()
  const exerciseDate = getExerciseDate(weekStart)
  const exerciseDateStr = exerciseDate.toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayStr = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  })

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

  // Find user's registration for their own skill group
  const mySkillSession = (sessions ?? []).find(s => s.skill_level === profile?.skill_level)
  const mySkillReg = mySkillSession ? myRegMap[mySkillSession.id] : null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">אימון השבוע</h2>
        <p className="text-sm font-medium text-gray-700">{exerciseDateStr}</p>
        <p className="text-xs text-gray-400 mt-0.5">היום: {todayStr}</p>
      </div>

      {/* Registration status banner */}
      {mySkillReg?.status === 'confirmed' && (
        <div className="bg-green-500 text-white rounded-2xl p-5 text-center shadow-md">
          <p className="text-4xl mb-2">✓</p>
          <p className="text-xl font-bold">נרשמת לאימון!</p>
          <p className="text-sm opacity-90 mt-1">
            {SKILL_LABEL[profile?.skill_level ?? '']} · {exerciseDateStr}
          </p>
        </div>
      )}

      {mySkillReg?.status === 'waitlist' && (
        <div className="bg-yellow-400 text-yellow-900 rounded-2xl p-5 text-center shadow-md">
          <p className="text-4xl mb-2">⏳</p>
          <p className="text-xl font-bold">ברשימת המתנה #{mySkillReg.waitlist_position}</p>
          <p className="text-sm opacity-80 mt-1">
            {SKILL_LABEL[profile?.skill_level ?? '']} · {exerciseDateStr}
          </p>
        </div>
      )}

      {mySkillReg?.status === 'pending_confirmation' && (
        <div className="bg-orange-400 text-white rounded-2xl p-5 text-center shadow-md animate-pulse">
          <p className="text-4xl mb-2">⚠️</p>
          <p className="text-xl font-bold">יש לך מקום! אשר עכשיו</p>
          <p className="text-sm opacity-90 mt-1">לחץ על כפתור האישור למטה — יש לך שעה</p>
        </div>
      )}

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
