import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date().toISOString()

  // Find expired pending_confirmation registrations
  const { data: expired } = await supabase
    .from('registrations')
    .select('id, session_id, user_id')
    .eq('status', 'pending_confirmation')
    .lt('waitlist_expires_at', now)

  let processed = 0

  for (const reg of expired ?? []) {
    // Delete the expired pending registration
    await supabase.from('registrations').delete().eq('id', reg.id)

    // Notify user their time expired
    await supabase.from('notifications').insert({
      user_id: reg.user_id,
      message:
        'Your waitlist spot expired because you did not confirm in time. You have been moved back.',
    })

    // Find next person on the waitlist
    const { data: nextWaiting } = await supabase
      .from('registrations')
      .select('id, user_id')
      .eq('session_id', reg.session_id)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .single()

    if (nextWaiting) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      await supabase
        .from('registrations')
        .update({
          status: 'pending_confirmation',
          waitlist_notified_at: now,
          waitlist_expires_at: expiresAt,
          waitlist_position: null,
        })
        .eq('id', nextWaiting.id)

      await supabase.from('notifications').insert({
        user_id: nextWaiting.user_id,
        message:
          'A spot is available in your session! Open the app to confirm within 1 hour.',
      })
    }

    processed++
  }

  return new Response(
    JSON.stringify({ processed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
