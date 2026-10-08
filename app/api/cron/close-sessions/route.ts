import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/sessions'
import { getActiveWeekStart, hasRegistrationClosed } from '@/lib/week'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = getActiveWeekStart()

  // Cron schedule is UTC, so in some seasons it can fire before 12:00 Israel time
  if (!hasRegistrationClosed(weekStart)) {
    return NextResponse.json({ skipped: 'too early', weekStart })
  }

  const { error } = await createAdminClient()
    .from('sessions')
    .update({ is_open: false })
    .eq('week_start', weekStart)

  if (error) {
    console.error('close-sessions cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, weekStart })
}
