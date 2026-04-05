import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const SKILL_LABEL: Record<string, string> = {
  beginner: 'Beginner (7AM group)',
  amateur: 'Amateur (8AM group)',
  expert: 'Expert (9AM & 10AM group)',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  waitlist: 'Waitlist',
  pending_confirmation: 'Needs confirmation',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: myRegistrations } = await supabase
    .from('registrations')
    .select(
      'id, status, waitlist_position, created_at, sessions(time_slot, week_start, skill_level)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{profile?.name}</p>
            <p className="text-sm text-gray-500">
              {SKILL_LABEL[profile?.skill_level ?? '']}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {profile?.total_signups ?? 0}
            </p>
            <p className="text-xs text-blue-500 mt-0.5 font-medium">
              Total sessions
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700 tracking-widest">
              {profile?.idf_number}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">IDF number</p>
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

      {/* Registration history */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">My registrations</h3>
        </div>

        {(myRegistrations ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 p-6 text-center">
            No registrations yet
          </p>
        ) : (
          (myRegistrations ?? []).map((reg: any) => (
            <div
              key={reg.id}
              className="p-4 border-b border-gray-50 last:border-0 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {reg.sessions?.time_slot?.slice(0, 5)} —{' '}
                  {new Date(
                    reg.sessions?.week_start + 'T00:00:00'
                  ).toLocaleDateString('en-IL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">
                  {reg.sessions?.skill_level}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  reg.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : reg.status === 'waitlist'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {reg.status === 'waitlist'
                  ? `Waitlist #${reg.waitlist_position}`
                  : STATUS_LABEL[reg.status] ?? reg.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Sign out */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
