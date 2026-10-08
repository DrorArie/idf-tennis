import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, openWeek } from '@/lib/sessions'
import { getActiveWeekStart, hasRegistrationOpened } from '@/lib/week'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = getActiveWeekStart()

  // Cron schedule is UTC, so in some seasons it can fire before 12:00 Israel time
  if (!hasRegistrationOpened(weekStart)) {
    return NextResponse.json({ skipped: 'too early', weekStart })
  }

  const { error } = await openWeek(createAdminClient(), weekStart)

  if (error) {
    console.error('open-sessions cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, weekStart })
}
