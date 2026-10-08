'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // The reset link signs the user in. Depending on timing Supabase reports this as
    // PASSWORD_RECOVERY, SIGNED_IN or an already-existing session — any of them means ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    // If no session shows up, the link is expired or was already used
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setReady(true)
      else setLinkInvalid(true)
    }, 4000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }
    if (password.length < 6) {
      setError('סיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('שגיאה באיפוס הסיסמה. נסה לשלוח קישור חדש.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (!ready && linkInvalid) {
    return (
      <div className="text-center space-y-3 py-8">
        <p className="text-gray-700 text-sm">הקישור לאיפוס הסיסמה פג תוקף או כבר נוצל.</p>
        <a href="/forgot-password" className="block text-sm text-blue-600 hover:underline">
          שלח קישור חדש
        </a>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="text-center space-y-3 py-8">
        <p className="text-gray-500 text-sm">מאמת קישור איפוס...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">איפוס סיסמה</h2>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'מאפס...' : 'אפס סיסמה'}
      </button>
    </form>
  )
}
