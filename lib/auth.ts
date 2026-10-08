import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/sessions'

export interface Profile {
  id: string
  name: string
  phone: string
  email: string | null
  skill_level: string
  service_type: string
  is_admin: boolean
  is_blacklisted: boolean
  total_signups: number
}

// Cached per request: layout, page and actions share one auth check and one profile read.
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id, name, phone, email, skill_level, service_type, is_admin, is_blacklisted, total_signups')
    .eq('id', user.id)
    .maybeSingle()
  return data
})

// For pages: signed in, not blocked. Profile may be null if account creation failed half-way.
export async function requireMember() {
  const user = await getUser()
  if (!user) redirect('/login')
  const profile = await getProfile()
  if (profile?.is_blacklisted) redirect('/login?reason=blacklisted')
  return { user, profile }
}

export async function requireAdmin() {
  const { user, profile } = await requireMember()
  if (!profile?.is_admin) redirect('/dashboard')
  return { user, profile }
}

// For server actions: returns null instead of redirecting.
export async function currentAdmin() {
  const profile = await getProfile()
  return profile?.is_admin && !profile.is_blacklisted ? profile : null
}
