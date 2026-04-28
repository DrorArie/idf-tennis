import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', session_id).single()
  if (!session?.is_open) return NextResponse.json({ error: 'Session not open' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('skill_level, is_blacklisted, email').eq('id', user.id).single()
  if (profile?.is_blacklisted) return NextResponse.json({ error: 'Account restricted' }, { status: 403 })
  if (session.skill_level !== profile?.skill_level) return NextResponse.json({ error: 'Skill level mismatch' }, { status: 400 })

  const { data: existing } = await supabase
    .from('registrations').select('id, status').eq('session_id', session_id).eq('user_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })

  const { data: counts } = await supabase.rpc('get_confirmed_counts', { session_ids: [session_id] })
  const confirmedCount: number = counts?.[0]?.count ?? 0

  if (confirmedCount < session.capacity) {
    await supabase.from('registrations').insert({ session_id, user_id: user.id, status: 'confirmed' })
    await supabase.rpc('increment_total_signups', { uid: user.id })
    return NextResponse.json({ status: 'confirmed' })
  }

  // Add to waitlist
  const { data: lastWaitlist } = await supabase
    .from('registrations').select('waitlist_position')
    .eq('session_id', session_id).eq('status', 'waitlist')
    .order('waitlist_position', { ascending: false }).limit(1).single()

  const nextPosition = (lastWaitlist?.waitlist_position ?? 0) + 1

  await supabase.from('registrations').insert({
    session_id, user_id: user.id, status: 'waitlist', waitlist_position: nextPosition,
  })

  const msg = `נרשמת לרשימת ההמתנה. אתה במקום #${nextPosition}.`
  await createNotification(admin, user.id, msg)
  if (profile?.email) {
    await sendEmail(profile.email, 'נרשמת לרשימת ההמתנה', msg)
  }

  return NextResponse.json({ status: 'waitlist', position: nextPosition })
}
