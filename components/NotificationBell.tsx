'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  message: string
  is_read: boolean
  created_at: string
}

const timeFmt = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
})

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  const unread = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data ?? [])
    }
    load()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  async function handleOpen() {
    setOpen(!open)
    if (!open && unread > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    }
  }

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors" aria-label="התראות">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-ball text-court-night text-[10px] rounded-full flex items-center justify-center font-bold animate-pop">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div dir="rtl" className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white text-ink rounded-2xl shadow-2xl shadow-court-night/20 border border-line z-50 max-h-[70vh] overflow-y-auto animate-pop origin-top-right">
            <div className="px-4 py-3 border-b border-line sticky top-0 bg-white/95 backdrop-blur">
              <p className="font-semibold">התראות</p>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-ink-soft p-8 text-center">אין התראות עדיין</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-line/60 last:border-0 flex gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-line' : 'bg-court'}`} />
                  <div>
                    <p className="text-sm leading-relaxed">{n.message}</p>
                    <p className="text-xs text-ink-soft/70 mt-1">{timeFmt.format(new Date(n.created_at))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
