import { Suspense } from 'react'
import Link from 'next/link'
import { getProfile, getUser } from '@/lib/auth'
import NotificationBell from '@/components/NotificationBell'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'

// The layout doesn't await anything, so tab switches show the page's loading skeleton
// immediately. User-specific bits stream in behind Suspense.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header dir="ltr" className="sticky top-0 z-40 bg-court-deep text-white">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" aria-label="דף הבית">
            <Logo light />
          </Link>
          <Suspense fallback={<div className="w-24 h-8" />}>
            <HeaderUser />
          </Suspense>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-5 pb-32">{children}</main>

      <Suspense fallback={<BottomNav isAdmin={false} />}>
        <Nav />
      </Suspense>
    </div>
  )
}

async function HeaderUser() {
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  if (!user) return null
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-white/80 font-medium" dir="rtl">{profile?.name?.split(' ')[0]}</span>
      <NotificationBell userId={user.id} />
    </div>
  )
}

async function Nav() {
  const profile = await getProfile()
  return <BottomNav isAdmin={!!profile?.is_admin} />
}
