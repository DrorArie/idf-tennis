'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Field, FormError, SubmitButton } from '@/components/Form'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email')).trim()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) setError('שגיאה בשליחת המייל. בדוק/י את הכתובת ונסה/י שוב.')
    else setSentTo(email)
  }

  if (sentTo) {
    return (
      <div className="text-center space-y-3 py-2 animate-pop">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-ball grid place-items-center">
          <svg className="w-7 h-7 text-court-night" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold">בדוק/י את תיבת המייל</h2>
        <p className="text-ink-soft text-sm">שלחנו קישור לאיפוס הסיסמה אל <span className="font-medium text-ink" dir="ltr">{sentTo}</span></p>
        <a href="/login" className="inline-block text-sm font-semibold text-court hover:underline pt-2">חזרה לכניסה</a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">שכחתי סיסמה</h2>
        <p className="text-sm text-ink-soft mt-1">נשלח לך קישור לבחירת סיסמה חדשה.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}
        <Field label="אימייל" name="email" type="email" autoComplete="email" required dir="ltr" className="text-right" />
        <SubmitButton pendingLabel="שולח…" pending={loading}>שליחת קישור</SubmitButton>
      </form>
      <p className="text-sm text-center">
        <a href="/login" className="text-ink-soft hover:text-court">חזרה לכניסה</a>
      </p>
    </div>
  )
}
