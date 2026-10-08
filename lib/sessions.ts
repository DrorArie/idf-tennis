import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_CAPACITY, WEEK_SLOTS, getActiveWeekStart, isRegistrationWindow } from '@/lib/week'

export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function weekRows(weekStart: string) {
  return WEEK_SLOTS.map((slot) => ({
    week_start: weekStart,
    ...slot,
    capacity: DEFAULT_CAPACITY,
    is_open: true,
  }))
}

// Opens the week's sessions, creating any that are missing and re-opening existing ones.
export async function openWeek(admin: SupabaseClient, weekStart: string) {
  return admin.from('sessions').upsert(weekRows(weekStart), { onConflict: 'week_start,time_slot' })
}

// Creates the active week's sessions if registration time has arrived and they don't exist yet.
// Never touches existing rows, so admin changes are kept. Safety net in case the cron is late.
export async function ensureActiveWeekOpen(admin: SupabaseClient, now = new Date()) {
  const weekStart = getActiveWeekStart(now)
  if (!isRegistrationWindow(weekStart, now)) return
  const { error } = await admin
    .from('sessions')
    .upsert(weekRows(weekStart), { onConflict: 'week_start,time_slot', ignoreDuplicates: true })
  if (error) console.error('ensureActiveWeekOpen error:', error)
}
