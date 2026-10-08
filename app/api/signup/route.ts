import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { createAdminClient } from '@/lib/sessions'
import { hasRegistrationClosed } from '@/lib/week'

const admin = createAdminClient()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'יש להתחבר מחדש' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', session_id).single()
  if (!session?.is_open || hasRegistrationClosed(session.week_start)) {
    return NextResponse.json({ error: 'ההרשמה לאימון זה סגורה' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('skill_level, is_blacklisted, email').eq('id', user.id).single()
  if (profile?.is_blacklisted) return NextResponse.json({ error: 'החשבון חסום להרשמה' }, { status: 403 })
  if (session.skill_level !== profile?.skill_level) {
    return NextResponse.json({ error: 'ניתן להירשם רק לקבוצה של הרמה שלך' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('registrations').select('id, status').eq('session_id', session_id).eq('user_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'כבר נרשמת לאימון זה' }, { status: 400 })

  const { data: counts } = await supabase.rpc('get_confirmed_counts', { session_ids: [session_id] })
  const confirmedCount: number = counts?.[0]?.count ?? 0

  if (confirmedCount < session.capacity) {
    const { error } = await supabase
      .from('registrations').insert({ session_id, user_id: user.id, status: 'confirmed' })
    if (error) {
      console.error('signup insert error:', error)
      return NextResponse.json({ error: 'ההרשמה נכשלה, נסה שוב' }, { status: 500 })
    }
    await supabase.rpc('increment_total_signups', { uid: user.id })
    return NextResponse.json({ status: 'confirmed' })
  }

  // Add to waitlist (admin client so we see everyone's positions, not just our own rows)
  const { data: lastWaitlist } = await admin
    .from('registrations').select('waitlist_position')
    .eq('session_id', session_id).eq('status', 'waitlist')
    .order('waitlist_position', { ascending: false }).limit(1).maybeSingle()

  const nextPosition = (lastWaitlist?.waitlist_position ?? 0) + 1

  const { error } = await supabase.from('registrations').insert({
    session_id, user_id: user.id, status: 'waitlist', waitlist_position: nextPosition,
  })
  if (error) {
    console.error('waitlist insert error:', error)
    return NextResponse.json({ error: 'ההרשמה נכשלה, נסה שוב' }, { status: 500 })
  }

  const msg = `נרשמת לרשימת ההמתנה. אתה במקום #${nextPosition}.`
  await createNotification(admin, user.id, msg)
  if (profile?.email) {
    await sendEmail(profile.email, 'נרשמת לרשימת ההמתנה', msg)
  }

  return NextResponse.json({ status: 'waitlist', position: nextPosition })
}
