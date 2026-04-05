import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { session_id } = body
  if (!session_id)
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  // Get the user's registration
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .single()

  if (!reg)
    return NextResponse.json({ error: 'Not registered' }, { status: 404 })

  const wasConfirmed =
    reg.status === 'confirmed' || reg.status === 'pending_confirmation'

  // Delete the registration
  await supabase.from('registrations').delete().eq('id', reg.id)

  if (wasConfirmed) {
    // Decrement total signups (only if it was confirmed, not pending)
    if (reg.status === 'confirmed') {
      await supabase.rpc('decrement_total_signups', { uid: user.id })
    }

    // Advance the waitlist: find next person in line
    const { data: nextWaiting } = await supabase
      .from('registrations')
      .select('id, user_id')
      .eq('session_id', session_id)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .single()

    if (nextWaiting) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      await supabase
        .from('registrations')
        .update({
          status: 'pending_confirmation',
          waitlist_notified_at: new Date().toISOString(),
          waitlist_expires_at: expiresAt,
        })
        .eq('id', nextWaiting.id)

      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: nextWaiting.user_id,
        message:
          'A spot opened up in your session! Open the app to confirm your registration. You have 1 hour.',
      })
    }
  }

  return NextResponse.json({ success: true })
}
