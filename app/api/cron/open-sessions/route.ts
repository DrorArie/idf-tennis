import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get today's date in Israel timezone (will be Tuesday when cron fires)
  const weekStart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
  }).format(new Date())

  const sessions = [
    { week_start: weekStart, time_slot: '07:00:00', skill_level: 'beginner', capacity: 8, is_open: true },
    { week_start: weekStart, time_slot: '08:00:00', skill_level: 'amateur', capacity: 8, is_open: true },
    { week_start: weekStart, time_slot: '09:00:00', skill_level: 'expert_a', capacity: 8, is_open: true },
    { week_start: weekStart, time_slot: '10:00:00', skill_level: 'expert_b', capacity: 8, is_open: true },
  ]

  const { error } = await supabaseAdmin
    .from('sessions')
    .upsert(sessions, { onConflict: 'week_start,time_slot' })

  if (error) {
    console.error('open-sessions cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, weekStart })
}
