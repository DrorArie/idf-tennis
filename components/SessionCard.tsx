'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SKILL_LABEL: Record<string, string> = {
  beginner: 'מתחילים',
  amateur: 'חובבנים',
  expert_a: 'מתקדמים א׳ (9:00-10:00)',
  expert_b: 'מתקדמים ב׳ (10:00-11:00)',
}

const TIME_LABEL: Record<string, string> = {
  '07:00:00': '07:00',
  '08:00:00': '08:00',
  '09:00:00': '09:00',
  '10:00:00': '10:00',
}

interface Session {
  id: string
  time_slot: string
  skill_level: string
  capacity: number
  is_open: boolean
  confirmed_count: number
}

interface Registration {
  status: string
  waitlist_position?: number | null
}

interface Props {
  session: Session
  myRegistration: Registration | null
  userSkillLevel: string
}

export default function SessionCard({ session, myRegistration, userSkillLevel }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const spotsLeft = session.capacity - session.confirmed_count
  const isMyLevel = session.skill_level === userSkillLevel

  async function handleSignUp() {
    setLoading(true)
    await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    router.refresh()
    setLoading(false)
  }

  async function handleCancel() {
    setLoading(true)
    await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    router.refresh()
    setLoading(false)
  }

  const statusBadge = myRegistration ? (
    myRegistration.status === 'confirmed' ? (
      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✓ רשום</span>
    ) : myRegistration.status === 'waitlist' ? (
      <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">
        המתנה #{myRegistration.waitlist_position}
      </span>
    ) : (
      <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
        ⚠ אשר עכשיו!
      </span>
    )
  ) : null

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-colors ${isMyLevel ? 'border-blue-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xl font-bold text-gray-900">{TIME_LABEL[session.time_slot] ?? session.time_slot}</p>
          <p className="text-sm text-gray-500">
            {SKILL_LABEL[session.skill_level]}
            {isMyLevel && <span className="mr-1.5 text-blue-500 font-medium">• הרמה שלך</span>}
          </p>
        </div>
        {statusBadge}
      </div>

      {!session.is_open ? (
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-sm text-gray-400">נפתח בכל יום שלישי בשעה 12:00</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{session.confirmed_count}/{session.capacity} מקומות תפוסים</span>
              <span className={spotsLeft === 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                {spotsLeft > 0 ? `נותרו ${spotsLeft}` : 'מלא'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${spotsLeft === 0 ? 'bg-red-400' : 'bg-blue-500'}`}
                style={{ width: `${(session.confirmed_count / session.capacity) * 100}%` }}
              />
            </div>
          </div>

          {isMyLevel ? (
            myRegistration ? (
              <div className="space-y-2">
                {myRegistration.status === 'pending_confirmation' && (
                  <button
                    onClick={handleSignUp} disabled={loading}
                    className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'מאשר...' : 'אשר את מקומי'}
                  </button>
                )}
                <button
                  onClick={handleCancel} disabled={loading}
                  className="w-full border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? '...' : 'ביטול הרשמה'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignUp} disabled={loading}
                className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'רגע...' : spotsLeft > 0 ? 'הרשמה' : 'הצטרפות לרשימת המתנה'}
              </button>
            )
          ) : null}
        </>
      )}
    </div>
  )
}
