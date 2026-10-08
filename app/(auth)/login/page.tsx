'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, FormError, SubmitButton } from '@/components/Form'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'blacklisted') {
      supabase.auth.signOut().then(() => setError('החשבון שלך נחסם. לפרטים פנה/י למנהל האימונים.'))
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')).trim(),
      password: String(form.get('password')),
    })
    if (error) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
    } else {
      router.replace('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">כניסה</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}
        <Field label="אימייל" name="email" type="email" autoComplete="email" required dir="ltr" className="text-right" />
        <Field label="סיסמה" name="password" type="password" autoComplete="current-password" required dir="ltr" className="text-right" />
        <SubmitButton pendingLabel="מתחבר…" pending={loading}>כניסה</SubmitButton>
      </form>
      <div className="flex items-center justify-between text-sm">
        <a href="/forgot-password" className="text-ink-soft hover:text-court">שכחתי סיסמה</a>
        <a href="/register" className="font-semibold text-court hover:underline">משתמש/ת חדש/ה? הרשמה</a>
      </div>
    </div>
  )
}
