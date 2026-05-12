'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError('שגיאה בשליחת המייל. בדוק את הכתובת ונסה שוב.')
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <p className="text-4xl">📧</p>
        <h2 className="text-xl font-semibold text-gray-800">בדוק את תיבת הדואר</h2>
        <p className="text-sm text-gray-600">שלחנו לך קישור לאיפוס הסיסמה לכתובת <span className="font-medium">{email}</span></p>
        <Link href="/login" className="block text-sm text-blue-600 hover:underline mt-4">
          חזרה לכניסה
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">שכחתי סיסמה</h2>
      <p className="text-sm text-gray-500">הכנס את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.</p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
      </button>

      <p className="text-sm text-center text-gray-600">
        <Link href="/login" className="text-blue-600 hover:underline">חזרה לכניסה</Link>
      </p>
    </form>
  )
}
