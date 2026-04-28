import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

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

  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status, waitlist_position')
    .eq('session_id', session_id).eq('user_id', user.id).single()

  if (!reg) return NextResponse.json({ error: 'Not registered' }, { status: 404 })

  if (reg.status === 'confirmed') {
    // Delete the confirmed registration
    await supabase.from('registrations').delete().eq('id', reg.id)
    await supabase.rpc('decrement_total_signups', { uid: user.id })

    // Auto-promote the first person on the waitlist
    const { data: nextWaiter } = await admin
      .from('registrations')
      .select('id, user_id')
      .eq('session_id', session_id).eq('status', 'waitlist')
      .order('waitlist_position', { ascending: true })
      .limit(1).single()

    if (nextWaiter) {
      // Promote to confirmed immediately — no confirmation step
      await admin
        .from('registrations')
        .update({ status: 'confirmed', waitlist_position: null })
        .eq('id', nextWaiter.id)
      await admin.rpc('increment_total_signups', { uid: nextWaiter.user_id })

      const { data: promotedProfile } = await admin
        .from('profiles').select('email').eq('id', nextWaiter.user_id).single()

      const promotedMsg = 'כל הכבוד! התפנה מקום ונרשמת לאימון.'
      await createNotification(admin, nextWaiter.user_id, promotedMsg)
      if (promotedProfile?.email) {
        await sendEmail(promotedProfile.email, 'נרשמת לאימון טניס!', promotedMsg)
      }

      // Shift remaining waitlist positions down by 1 and notify each
      const { data: remaining } = await admin
        .from('registrations')
        .select('id, user_id, waitlist_position')
        .eq('session_id', session_id).eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true })

      for (const r of (remaining ?? [])) {
        const newPos = r.waitlist_position - 1
        await admin.from('registrations').update({ waitlist_position: newPos }).eq('id', r.id)

        const { data: p } = await admin
          .from('profiles').select('email').eq('id', r.user_id).single()

        const posMsg = `אתה עכשיו במקום #${newPos} ברשימת ההמתנה.`
        await createNotification(admin, r.user_id, posMsg)
        if (p?.email) await sendEmail(p.email, 'עדכון מיקום ברשימת ההמתנה', posMsg)
      }
    }
  } else if (reg.status === 'waitlist') {
    const cancelledPos = reg.waitlist_position!
    await supabase.from('registrations').delete().eq('id', reg.id)

    // Shift down everyone who was behind the cancelled position
    const { data: toUpdate } = await admin
      .from('registrations')
      .select('id, user_id, waitlist_position')
      .eq('session_id', session_id).eq('status', 'waitlist')
      .gt('waitlist_position', cancelledPos)
      .order('waitlist_position', { ascending: true })

    for (const r of (toUpdate ?? [])) {
      const newPos = r.waitlist_position - 1
      await admin.from('registrations').update({ waitlist_position: newPos }).eq('id', r.id)

      const { data: p } = await admin
        .from('profiles').select('email').eq('id', r.user_id).single()

      const posMsg = `אתה עכשיו במקום #${newPos} ברשימת ההמתנה.`
      await createNotification(admin, r.user_id, posMsg)
      if (p?.email) await sendEmail(p.email, 'עדכון מיקום ברשימת ההמתנה', posMsg)
    }
  }

  return NextResponse.json({ success: true })
}
