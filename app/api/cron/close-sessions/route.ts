import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cron fires on Thursday — compute the Tuesday of the same week (Israel time)
  const now = new Date()
  const israelDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const daysSinceTuesday = (israelDate.getDay() - 2 + 7) % 7
  israelDate.setDate(israelDate.getDate() - daysSinceTuesday)
  const weekStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(israelDate)

  const { error } = await supabaseAdmin
    .from('sessions')
    .update({ is_open: false })
    .eq('week_start', weekStart)

  if (error) {
    console.error('close-sessions cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, weekStart })
}
