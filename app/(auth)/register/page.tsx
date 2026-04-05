'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const SKILL_LEVELS = [
  { value: 'beginner', label: 'מתחיל (קבוצת 7:00)' },
  { value: 'amateur', label: 'חובבן (קבוצת 8:00)' },
  { value: 'expert', label: 'מתקדם (קבוצת 9:00, 10:00 או 11:00)' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    idf_number: '',
    skill_level: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^\d{7}$/.test(form.idf_number)) {
      setError('מספר אישי חייב להיות בדיוק 7 ספרות')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('הסיסמאות אינן תואמות')
      return
    }
    if (form.password.length < 6) {
      setError('סיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'ההרשמה נכשלה')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name: form.name,
      phone: form.phone,
      idf_number: form.idf_number,
      skill_level: form.skill_level,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">יצירת חשבון</h2>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
        <input
          type="text" required value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
        <input
          type="email" required value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">מספר טלפון</label>
        <input
          type="tel" required value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">מספר אישי</label>
        <input
          type="text" required maxLength={7}
          value={form.idf_number}
          onChange={(e) => set('idf_number', e.target.value.replace(/\D/g, ''))}
          placeholder="7 ספרות"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
        <p className="text-xs text-gray-500 mt-1">המספר האישי שלך בצבא (7 ספרות בלבד)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">רמת משחק</label>
        <select
          required value={form.skill_level}
          onChange={(e) => set('skill_level', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        >
          <option value="">בחר רמה</option>
          {SKILL_LEVELS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
        <input
          type="password" required value={form.password}
          onChange={(e) => set('password', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה</label>
        <input
          type="password" required value={form.confirm_password}
          onChange={(e) => set('confirm_password', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'יוצר חשבון...' : 'יצירת חשבון'}
      </button>
      <p className="text-sm text-center text-gray-600">
        כבר יש לך חשבון?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">כניסה</Link>
      </p>
    </form>
  )
}
