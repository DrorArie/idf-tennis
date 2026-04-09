export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const TIME_LABEL: Record<string, string> = {
  '07:00:00': '07:00',
  '08:00:00': '08:00',
  '09:00:00': '09:00',
  '10:00:00': '10:00',
  '11:00:00': '11:00',
}

const SKILL_HE: Record<string, string> = {
  beginner: 'מתחילים',
  amateur: 'חובבנים',
  expert_a: 'מתקדמים א׳',
  expert_b: 'מתקדמים ב׳',
}

function getThisWeekTuesday(): string {
  const now = new Date()
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const day = israelTime.getDay()
  const daysSinceTuesday = (day - 2 + 7) % 7
  const tuesday = new Date(israelTime)
  tuesday.setDate(israelTime.getDate() - daysSinceTuesday)
  const y = tuesday.getFullYear()
  const m = String(tuesday.getMonth() + 1).padStart(2, '0')
  const d = String(tuesday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const weekStart = getThisWeekTuesday()

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, time_slot, skill_level, is_open, capacity')
    .eq('week_start', weekStart)
    .order('time_slot')

  const sessionIds = (sessions ?? []).map((s) => s.id)

  const { data: weekRegs } = sessionIds.length > 0
    ? await supabase
        .from('registrations')
        .select('session_id, user_id, profiles(name, phone, total_signups)')
        .in('session_id', sessionIds)
        .eq('status', 'confirmed')
    : { data: [] }

  const { data: waitlistRegs } = sessionIds.length > 0
    ? await supabase
        .from('registrations')
        .select('session_id, user_id, waitlist_position, profiles(name, phone)')
        .in('session_id', sessionIds)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true })
    : { data: [] }

  const regsBySession: Record<string, any[]> = {}
  ;(weekRegs ?? []).forEach((r: any) => {
    if (!regsBySession[r.session_id]) regsBySession[r.session_id] = []
    regsBySession[r.session_id].push(r)
  })

  const waitlistBySession: Record<string, any[]> = {}
  ;(waitlistRegs ?? []).forEach((r: any) => {
    if (!waitlistBySession[r.session_id]) waitlistBySession[r.session_id] = []
    waitlistBySession[r.session_id].push(r)
  })

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, name, phone, idf_number, skill_level, total_signups, is_blacklisted, is_admin')
    .order('total_signups', { ascending: false })

  async function openWeekSessions() {
    'use server'
    const { createClient: createAdmin } = await import('@supabase/supabase-js')
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const now = new Date()
    const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
    const day = israelTime.getDay()
    const daysSinceTuesday = (day - 2 + 7) % 7
    const tuesday = new Date(israelTime)
    tuesday.setDate(israelTime.getDate() - daysSinceTuesday)
    const y = tuesday.getFullYear()
    const m = String(tuesday.getMonth() + 1).padStart(2, '0')
    const d = String(tuesday.getDate()).padStart(2, '0')
    const ws = `${y}-${m}-${d}`
    await admin.from('sessions').upsert([
      { week_start: ws, time_slot: '07:00:00', skill_level: 'beginner', capacity: 8, is_open: true },
      { week_start: ws, time_slot: '08:00:00', skill_level: 'amateur', capacity: 8, is_open: true },
      { week_start: ws, time_slot: '09:00:00', skill_level: 'expert_a', capacity: 8, is_open: true },
      { week_start: ws, time_slot: '10:00:00', skill_level: 'expert_b', capacity: 8, is_open: true },
    ], { onConflict: 'week_start,time_slot' })
    revalidatePath('/admin')
    revalidatePath('/dashboard')
  }

  async function toggleBlacklist(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    const currentStatus = formData.get('currentStatus') === 'true'
    const supabase = await createClient()
    await supabase.from('profiles').update({ is_blacklisted: !currentStatus }).eq('id', userId)
    revalidatePath('/admin')
  }

  const weekDateStr = new Date(weekStart + 'T00:00:00').toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">לוח ניהול</h2>
          <p className="text-sm text-gray-500">שבוע של {weekDateStr}</p>
        </div>
        <form action={openWeekSessions}>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            {(sessions ?? []).length > 0 ? '🔄 אפס השבוע' : '🟢 פתח השבוע'}
          </button>
        </form>
      </div>

      <section>
        <h3 className="text-base font-semibold text-gray-700 mb-3">הרשמות השבוע</h3>

        {(sessions ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">עדיין לא נוצרו אימונים השבוע</p>
          </div>
        ) : (
          (sessions ?? []).map((session) => {
            const confirmed = regsBySession[session.id] ?? []
            const waitlist = waitlistBySession[session.id] ?? []
            return (
              <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
                <div className="p-4 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">{TIME_LABEL[session.time_slot]}</p>
                    <p className="text-sm text-gray-500">
                      {SKILL_HE[session.skill_level]} · {confirmed.length}/{session.capacity} רשומים
                      {waitlist.length > 0 && ` · ${waitlist.length} ממתינים`}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${session.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {session.is_open ? 'פתוח' : 'סגור'}
                  </span>
                </div>

                {confirmed.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">אין רשומים עדיין</p>
                ) : (
                  confirmed.map((reg: any) => (
                    <div key={reg.user_id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{reg.profiles?.name}</p>
                        <p className="text-xs text-gray-400">{reg.profiles?.phone}</p>
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                        {reg.profiles?.total_signups} אימונים
                      </span>
                    </div>
                  ))
                )}

                {waitlist.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
                      <p className="text-xs font-semibold text-yellow-700">רשימת המתנה</p>
                    </div>
                    {waitlist.map((reg: any) => (
                      <div key={reg.user_id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between bg-yellow-50/30">
                        <div>
                          <p className="text-sm font-medium text-gray-800">#{reg.waitlist_position} {reg.profiles?.name}</p>
                          <p className="text-xs text-gray-400">{reg.profiles?.phone}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-700 mb-3">
          כל המשתתפים ({(allUsers ?? []).length})
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {(allUsers ?? []).map((u) => (
            <div key={u.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${u.is_blacklisted ? 'bg-red-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    {u.is_admin && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">מנהל</span>
                    )}
                    {u.is_blacklisted && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">חסום</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {u.phone} · #{u.idf_number} · {SKILL_HE[u.skill_level]}
                  </p>
                </div>
                <div className="flex items-center gap-2 mr-2 flex-shrink-0">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{u.total_signups}</span>
                  {!u.is_admin && (
                    <form action={toggleBlacklist}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="currentStatus" value={String(u.is_blacklisted)} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        u.is_blacklisted ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                        {u.is_blacklisted ? 'בטל חסימה' : 'חסום'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
