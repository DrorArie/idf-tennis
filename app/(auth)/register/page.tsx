'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner (7AM group)' },
  { value: 'amateur', label: 'Amateur (8AM group)' },
  { value: 'expert', label: 'Expert (9AM or 10AM group)' },
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
      setError('IDF personal number must be exactly 7 digits')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Registration failed')
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

  const fields = [
    { label: 'Full name', field: 'name', type: 'text' },
    { label: 'Email', field: 'email', type: 'email' },
    { label: 'Phone number', field: 'phone', type: 'tel' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Create account</h2>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      {fields.map(({ label, field, type }) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            type={type}
            required
            value={form[field as keyof typeof form]}
            onChange={(e) => set(field, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          IDF Personal Number
        </label>
        <input
          type="text"
          required
          maxLength={7}
          value={form.idf_number}
          onChange={(e) => set('idf_number', e.target.value.replace(/\D/g, ''))}
          placeholder="7 digits"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your military personal number (7 digits only)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skill level
        </label>
        <select
          required
          value={form.skill_level}
          onChange={(e) => set('skill_level', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select your level</option>
          {SKILL_LEVELS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {(['password', 'confirm_password'] as const).map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field === 'password' ? 'Password' : 'Confirm password'}
          </label>
          <input
            type="password"
            required
            value={form[field]}
            onChange={(e) => set(field, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <p className="text-sm text-center text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
