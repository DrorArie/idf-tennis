'use server'

import { revalidatePath } from 'next/cache'
import { currentAdmin } from '@/lib/auth'
import { adminOpenWeek, closeWeek, createAdminClient } from '@/lib/sessions'
import { adminRemoveRegistration, setCapacity, type ActionResult } from '@/lib/registrations'
import { getActiveWeekStart } from '@/lib/week'

const DENIED: ActionResult = { ok: false, error: 'אין הרשאת מנהל' }

function refresh() {
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function openWeekAction(): Promise<ActionResult> {
  if (!(await currentAdmin())) return DENIED
  const error = await adminOpenWeek(getActiveWeekStart())
  refresh()
  return error ? { ok: false, error: 'הפתיחה נכשלה, נסה שוב' } : { ok: true, message: 'ההרשמה נפתחה' }
}

export async function closeWeekAction(): Promise<ActionResult> {
  if (!(await currentAdmin())) return DENIED
  const error = await closeWeek(getActiveWeekStart())
  refresh()
  return error ? { ok: false, error: 'הסגירה נכשלה, נסה שוב' } : { ok: true, message: 'ההרשמה נסגרה' }
}

export async function removeParticipantAction(userId: string, sessionId: string): Promise<ActionResult> {
  if (!(await currentAdmin())) return DENIED
  const result = await adminRemoveRegistration(userId, sessionId)
  refresh()
  return result
}

export async function setCapacityAction(sessionId: string, capacity: number): Promise<ActionResult> {
  if (!(await currentAdmin())) return DENIED
  const result = await setCapacity(sessionId, capacity)
  refresh()
  return result
}

export async function setUserFlagAction(
  userId: string,
  flag: 'is_blacklisted' | 'is_admin',
  value: boolean
): Promise<ActionResult> {
  const me = await currentAdmin()
  if (!me) return DENIED
  if (userId === me.id) return { ok: false, error: 'אי אפשר לשנות את ההרשאות של עצמך' }
  if (flag !== 'is_blacklisted' && flag !== 'is_admin') return DENIED
  const { error } = await createAdminClient().from('profiles').update({ [flag]: value }).eq('id', userId)
  revalidatePath('/admin')
  return error ? { ok: false, error: 'השמירה נכשלה' } : { ok: true }
}
