import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_CAPACITY, WEEK_SLOTS, closesAt, getActiveWeekStart, isRegistrationWindow } from '@/lib/week'

let adminClient: SupabaseClient | null = null

// Service-role client. Only use on the server, after checking who the caller is.
export function createAdminClient(): SupabaseClient {
  adminClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  return adminClient
}

// Until migration 005 is applied the closes_at column doesn't exist; retry without it.
const missingClosesAt = (error: { message?: string } | null) => !!error?.message?.includes('closes_at')

function weekRows(weekStart: string, closes: string | null) {
  return WEEK_SLOTS.map((slot) => ({
    week_start: weekStart,
    ...slot,
    capacity: DEFAULT_CAPACITY,
    is_open: true,
    closes_at: closes,
  }))
}

async function upsertWeek(admin: SupabaseClient, weekStart: string, closes: string | null, keepExisting: boolean) {
  const opts = { onConflict: 'week_start,time_slot', ignoreDuplicates: keepExisting }
  let { error } = await admin.from('sessions').upsert(weekRows(weekStart, closes), opts)
  if (missingClosesAt(error)) {
    const rows = weekRows(weekStart, closes).map((r) => {
      const row: Partial<typeof r> = { ...r }
      delete row.closes_at
      return row
    })
    ;({ error } = await admin.from('sessions').upsert(rows, opts))
  }
  return error
}

// Creates the active week's sessions once registration time arrives (Tuesday 12:00).
// Existing rows are never touched, so an admin's open/close choice is kept.
export async function ensureActiveWeekOpen(now = new Date()) {
  const weekStart = getActiveWeekStart(now)
  if (!isRegistrationWindow(weekStart, now)) return null
  const error = await upsertWeek(createAdminClient(), weekStart, closesAt(weekStart).toISOString(), true)
  if (error) console.error('ensureActiveWeekOpen error:', error)
  return error
}

// Admin "open": opens all groups. Before Thursday 12:00 the normal deadline applies;
// after it, registration stays open until the admin closes it.
export async function adminOpenWeek(weekStart: string, now = new Date()) {
  const deadline = closesAt(weekStart)
  const closes = now < deadline ? deadline.toISOString() : null
  const admin = createAdminClient()
  const error = await upsertWeek(admin, weekStart, closes, true)
  if (error) return error
  // Re-open rows that already existed (upsert above skipped them)
  let { error: updError } = await admin.from('sessions').update({ is_open: true, closes_at: closes }).eq('week_start', weekStart)
  if (missingClosesAt(updError)) {
    ;({ error: updError } = await admin.from('sessions').update({ is_open: true }).eq('week_start', weekStart))
  }
  return updError
}

export async function closeWeek(weekStart: string) {
  const { error } = await createAdminClient().from('sessions').update({ is_open: false }).eq('week_start', weekStart)
  return error
}
