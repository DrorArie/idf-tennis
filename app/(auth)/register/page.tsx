'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, FormError, Select, SubmitButton } from '@/components/Form'
import { SERVICE_OPTIONS, SKILL_OPTIONS } from '@/lib/options'

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showServiceInfo, setShowServiceInfo] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setError('')

    if (f.password.length < 6) return setError('הסיסמה צריכה להכיל לפחות 6 תווים')
    if (f.password !== f.confirm_password) return setError('הסיסמאות אינן תואמות')
    if (!f.skill_level) return setError('יש לבחור רמת משחק')
    if (!f.service_type) return setError('יש לבחור סוג שירות')

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password })
    if (authError || !data.user) {
      setError(authError?.message.includes('registered') ? 'כבר קיים חשבון עם האימייל הזה — נסה/י להתחבר' : 'ההרשמה נכשלה, נסה/י שוב')
      setLoading(false)
      return
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.name, phone: f.phone, skill_level: f.skill_level, service_type: f.service_type }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'שגיאה ביצירת הפרופיל')
      setLoading(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">יצירת חשבון</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}
        <Field label="שם מלא" name="name" autoComplete="name" required />
        <Field label="אימייל" name="email" type="email" autoComplete="email" required dir="ltr" className="text-right" />
        <Field label="מספר טלפון" name="phone" type="tel" autoComplete="tel" required dir="ltr" className="text-right" />
        <Select label="רמת משחק" name="skill_level" options={SKILL_OPTIONS} placeholder="בחר/י רמה" required />
        <Select
          label="סוג שירות"
          name="service_type"
          options={SERVICE_OPTIONS}
          placeholder="בחר/י סוג שירות"
          required
          extra={
            <button
              type="button"
              onClick={() => setShowServiceInfo((v) => !v)}
              aria-label="מי יכול להירשם"
              className="w-5 h-5 rounded-full bg-court/10 text-court text-xs font-bold grid place-items-center hover:bg-court/20 cursor-pointer"
            >
              !
            </button>
          }
        >
          {showServiceInfo && (
            <p className="text-xs text-ink-soft bg-court/5 border border-court/15 rounded-xl px-3 py-2 mb-2 leading-relaxed animate-pop">
              האימונים מיועדים למשרתי קבע ולאזרחים עובדי צה״ל. חיילים במילואים אינם יכולים להירשם כרגע.
            </p>
          )}
        </Select>
        <Field label="סיסמה" name="password" type="password" autoComplete="new-password" required dir="ltr" className="text-right" />
        <Field label="אימות סיסמה" name="confirm_password" type="password" autoComplete="new-password" required dir="ltr" className="text-right" />
        <SubmitButton pendingLabel="יוצר חשבון…" pending={loading}>יצירת חשבון</SubmitButton>
      </form>
      <p className="text-sm text-center text-ink-soft">
        כבר יש לך חשבון? <a href="/login" className="font-semibold text-court hover:underline">כניסה</a>
      </p>
    </div>
  )
}
