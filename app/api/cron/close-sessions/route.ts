import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/sessions'
import { getActiveWeekStart } from '@/lib/week'

export const dynamic = 'force-dynamic'

// Signups already stop at each session's closes_at; this just flips is_open for display.
// Sessions an admin reopened after the deadline have closes_at = null and are left open.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = getActiveWeekStart()
  const { error } = await createAdminClient()
    .from('sessions')
    .update({ is_open: false })
    .eq('week_start', weekStart)
    .lte('closes_at', new Date().toISOString())

  if (error) {
    console.error('close-sessions cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, weekStart })
}
