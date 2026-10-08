import { NextRequest, NextResponse } from 'next/server'
import { ensureActiveWeekOpen } from '@/lib/sessions'
import { getActiveWeekStart, isRegistrationWindow } from '@/lib/week'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = getActiveWeekStart()
  // Cron schedule is UTC, so in some seasons it fires outside the window — pages open it on time anyway
  if (!isRegistrationWindow(weekStart)) {
    return NextResponse.json({ skipped: 'outside registration window', weekStart })
  }

  const error = await ensureActiveWeekOpen()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, weekStart })
}
