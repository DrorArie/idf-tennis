export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NotificationBell from '@/components/NotificationBell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, is_admin, is_blacklisted')
    .eq('id', user.id)
    .single()

  if (profile?.is_blacklisted) {
    await supabase.auth.signOut()
    redirect('/login?reason=blacklisted')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-bold text-gray-900">🎾 טניס צה״ל</h1>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.id} />
          <span className="text-sm text-gray-600 font-medium">
            {profile?.name?.split(' ')[0]}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-40">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 px-6 py-1 text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">אימונים</span>
        </Link>

        <Link href="/profile" className="flex flex-col items-center gap-0.5 px-6 py-1 text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs">פרופיל</span>
        </Link>

        {profile?.is_admin && (
          <Link href="/admin" className="flex flex-col items-center gap-0.5 px-6 py-1 text-gray-500 hover:text-blue-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs">ניהול</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
