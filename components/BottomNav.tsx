'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS = {
  dashboard: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  admin: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
}

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = [
    { href: '/dashboard', label: 'אימון', icon: ICONS.dashboard },
    { href: '/profile', label: 'פרופיל', icon: ICONS.profile },
    ...(isAdmin ? [{ href: '/admin', label: 'ניהול', icon: ICONS.admin }] : []),
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-white/90 backdrop-blur border-t border-line">
      <div className="max-w-lg mx-auto flex justify-around px-2 py-1.5">
        {items.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-2xl transition-colors ${
                active ? 'text-court' : 'text-ink-soft/70 hover:text-ink'
              }`}
            >
              {active && <span className="absolute inset-0 bg-court/8 rounded-2xl" />}
              <svg className="w-6 h-6 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className={`text-xs relative ${active ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
