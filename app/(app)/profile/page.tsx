export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const SKILL_LABEL: Record<string, string> = {
  beginner: 'מתחיל (קבוצת 7:00)',
  amateur: 'חובבן (קבוצת 8:00)',
  expert_a: 'מתקדם א׳ (קבוצת 9:00-10:00)',
  expert_b: 'מתקדם ב׳ (קבוצת 10:00-11:00)',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'רשום',
  waitlist: 'המתנה',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: myRegistrations } = await supabase
    .from('registrations')
    .select('id, status, waitlist_position, created_at, sessions(time_slot, week_start, skill_level)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  async function updateSkillLevel(formData: FormData) {
    'use server'
    const skill_level = formData.get('skill_level') as string
    const valid = ['beginner', 'amateur', 'expert_a', 'expert_b']
    if (!valid.includes(skill_level)) return
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ skill_level }).eq('id', user.id)
    revalidatePath('/profile')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{profile?.name}</p>
            <form action={updateSkillLevel} className="flex items-center gap-2 mt-0.5">
              <select
                name="skill_level"
                defaultValue={profile?.skill_level ?? ''}
                className="text-sm text-gray-500 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 cursor-pointer"
              >
                <option value="beginner">מתחיל (קבוצת 7:00)</option>
                <option value="amateur">חובבן (קבוצת 8:00)</option>
                <option value="expert_a">מתקדם א׳ (קבוצת 9:00)</option>
                <option value="expert_b">מתקדם ב׳ (קבוצת 10:00)</option>
              </select>
              <button type="submit" className="text-xs text-blue-500 hover:text-blue-700 font-medium">שמור</button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-3xl font-bold text-blue-600">{profile?.total_signups ?? 0}</p>
            <p className="text-xs text-blue-500 mt-0.5 font-medium">סה״כ אימונים</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700 tracking-widest">{profile?.idf_number}</p>
            <p className="text-xs text-gray-400 mt-0.5">מספר אישי</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📧</span>
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📱</span>
            <span>{profile?.phone}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">ההרשמות שלי</h3>
        </div>

        {(myRegistrations ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 p-6 text-center">עדיין לא נרשמת לאף אימון</p>
        ) : (
          (myRegistrations ?? []).map((reg: any) => (
            <div key={reg.id} className="p-4 border-b border-gray-50 last:border-0 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {reg.sessions?.time_slot?.slice(0, 5)} —{' '}
                  {new Date(reg.sessions?.week_start + 'T00:00:00').toLocaleDateString('he-IL', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {({ beginner: 'מתחילים', amateur: 'חובבנים', expert_a: 'מתקדמים א׳', expert_b: 'מתקדמים ב׳' } as Record<string,string>)[reg.sessions?.skill_level] ?? reg.sessions?.skill_level}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                reg.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {reg.status === 'waitlist' ? `המתנה #${reg.waitlist_position}` : STATUS_LABEL[reg.status] ?? reg.status}
              </span>
            </div>
          ))
        )}
      </div>

      <form action={signOut}>
        <button type="submit" className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors">
          התנתקות
        </button>
      </form>
    </div>
  )
}
