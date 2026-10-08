'use client'
import { useActionState } from 'react'
import { completeProfileAction } from '../actions'
import { Field, Select, SubmitButton, FormError } from '@/components/Form'
import { SERVICE_OPTIONS, SKILL_OPTIONS } from '@/lib/options'

export default function CompleteProfile({ email }: { email: string }) {
  const [state, formAction] = useActionState(completeProfileAction, null)
  return (
    <form action={formAction} className="rounded-[24px] bg-white border border-line p-6 space-y-4 animate-rise">
      <div>
        <h2 className="text-2xl font-bold">עוד רגע מסיימים</h2>
        <p className="text-ink-soft text-sm mt-1">יצירת החשבון ({email}) לא הושלמה. מלא/י את הפרטים כדי להתחיל.</p>
      </div>
      {state && !state.ok && <FormError>{state.error}</FormError>}
      <Field label="שם מלא" name="name" required />
      <Field label="מספר טלפון" name="phone" type="tel" required />
      <Select label="רמת משחק" name="skill_level" options={SKILL_OPTIONS} placeholder="בחר/י רמה" required />
      <Select
        label="סוג שירות"
        name="service_type"
        options={SERVICE_OPTIONS}
        placeholder="בחר/י סוג שירות"
        required
      />
      <SubmitButton pendingLabel="שומר…">שמירה והמשך</SubmitButton>
    </form>
  )
}
