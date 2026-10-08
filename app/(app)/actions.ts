'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getProfile, getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/sessions'
import { cancelRegistration, hasActiveRegistration, signUp, type ActionResult } from '@/lib/registrations'

const SKILLS = ['beginner', 'amateur', 'expert_a', 'expert_b']
const SERVICES = ['keva', 'ezrach']

function refresh() {
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  revalidatePath('/admin')
}

export async function signUpAction(sessionId: string): Promise<ActionResult> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'יש להתחבר מחדש' }
  const result = await signUp(user.id, sessionId)
  refresh()
  return result
}

export async function cancelAction(sessionId: string): Promise<ActionResult> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'יש להתחבר מחדש' }
  const result = await cancelRegistration(user.id, sessionId)
  refresh()
  return result
}

export async function updateProfileAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const profile = await getProfile()
  if (!profile) return { ok: false, error: 'יש להתחבר מחדש' }

  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const skill_level = String(formData.get('skill_level') ?? '')
  if (!name || !phone) return { ok: false, error: 'שם וטלפון הם שדות חובה' }
  if (!SKILLS.includes(skill_level)) return { ok: false, error: 'רמה לא תקינה' }
  if (skill_level !== profile.skill_level && (await hasActiveRegistration(profile.id))) {
    return { ok: false, error: 'כדי לשנות רמה, בטל/י קודם את ההרשמה לאימון השבוע' }
  }

  const { error } = await createAdminClient().from('profiles').update({ name, phone, skill_level }).eq('id', profile.id)
  if (error) return { ok: false, error: 'השמירה נכשלה, נסה שוב' }
  refresh()
  return { ok: true, message: 'נשמר' }
}

// For accounts whose sign-up created the login but not the profile
export async function completeProfileAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'יש להתחבר מחדש' }
  if (await getProfile()) redirect('/dashboard')

  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const skill_level = String(formData.get('skill_level') ?? '')
  const service_type = String(formData.get('service_type') ?? '')
  if (!name || !phone || !SKILLS.includes(skill_level) || !SERVICES.includes(service_type)) {
    return { ok: false, error: 'נא למלא את כל השדות' }
  }

  const { error } = await createAdminClient().from('profiles').insert({
    id: user.id, name, phone, skill_level, service_type, email: user.email,
  })
  if (error) return { ok: false, error: 'השמירה נכשלה, נסה שוב' }
  refresh()
  return { ok: true }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
