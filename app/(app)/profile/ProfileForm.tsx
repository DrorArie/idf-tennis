'use client'
import { useActionState } from 'react'
import { updateProfileAction } from '../actions'
import { Field, FormError, FormNotice, Select, SubmitButton } from '@/components/Form'
import { SKILL_OPTIONS } from '@/lib/options'

interface Props {
  name: string
  phone: string
  email: string
  skillLevel: string
  skillLocked: boolean
}

export default function ProfileForm({ name, phone, email, skillLevel, skillLocked }: Props) {
  const [state, formAction] = useActionState(updateProfileAction, null)
  return (
    <form action={formAction} className="space-y-4">
      {state && (state.ok ? <FormNotice>הפרטים נשמרו</FormNotice> : <FormError>{state.error}</FormError>)}
      <Field label="שם מלא" name="name" defaultValue={name} required />
      <Field label="טלפון" name="phone" type="tel" defaultValue={phone} required dir="ltr" className="text-right" />
      <Field label="אימייל" name="email" defaultValue={email} disabled dir="ltr" />
      <Select label="רמת משחק" name="skill_level" options={SKILL_OPTIONS} defaultValue={skillLevel} disabled={skillLocked} />
      {skillLocked && (
        <>
          <input type="hidden" name="skill_level" value={skillLevel} />
          <p className="text-xs text-ink-soft -mt-2">רשום/ה לאימון השבוע — כדי לשנות רמה צריך לבטל קודם את ההרשמה.</p>
        </>
      )}
      <SubmitButton pendingLabel="שומר…">שמירה</SubmitButton>
    </form>
  )
}
