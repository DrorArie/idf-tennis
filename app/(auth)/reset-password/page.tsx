'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, FormError, SubmitButton } from '@/components/Form'

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
      <div className="text-center space-y-3 py-4">
        <h2 className="text-xl font-bold">הקישור כבר לא בתוקף</h2>
        <p className="text-ink-soft text-sm">קישור האיפוס פג תוקף או שכבר השתמשו בו.</p>
        <a href="/forgot-password" className="inline-block text-sm font-semibold text-court hover:underline">שליחת קישור חדש</a>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="w-8 h-8 rounded-full border-4 border-line border-t-court animate-spin" />
        <p className="text-ink-soft text-sm">מאמת את הקישור…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">בחירת סיסמה חדשה</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}
        <Field label="סיסמה חדשה" name="password" type="password" autoComplete="new-password" required dir="ltr" className="text-right"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field label="אימות סיסמה" name="confirm" type="password" autoComplete="new-password" required dir="ltr" className="text-right"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <SubmitButton pendingLabel="שומר…" pending={loading}>שמירת הסיסמה</SubmitButton>
      </form>
    </div>
  )
}
