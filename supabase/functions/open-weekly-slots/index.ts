import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIME_SLOTS = [
  { time: '07:00:00', skill_level: 'beginner' },
  { time: '08:00:00', skill_level: 'amateur' },
  { time: '09:00:00', skill_level: 'expert' },
  { time: '10:00:00', skill_level: 'expert' },
  { time: '11:00:00', skill_level: 'expert' },
]

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get this Tuesday's date in Israel time
  const now = new Date()
  const israelTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
  const israelTime = new Date(israelTimeStr)
  const day = israelTime.getDay() // 0=Sun, 2=Tue
  const daysUntilTuesday = (2 - day + 7) % 7
  const tuesday = new Date(israelTime)
  tuesday.setDate(israelTime.getDate() + daysUntilTuesday)

  // Format as YYYY-MM-DD
  const year = tuesday.getFullYear()
  const month = String(tuesday.getMonth() + 1).padStart(2, '0')
  const dayStr = String(tuesday.getDate()).padStart(2, '0')
  const weekStart = `${year}-${month}-${dayStr}`

  const results = []

  for (const slot of TIME_SLOTS) {
    const { error } = await supabase.from('sessions').upsert(
      {
        week_start: weekStart,
        time_slot: slot.time,
        skill_level: slot.skill_level,
        capacity: 8,
        is_open: true,
      },
      { onConflict: 'week_start,time_slot' }
    )
    results.push({ slot: slot.time, error: error?.message ?? null })
  }

  return new Response(
    JSON.stringify({ success: true, week_start: weekStart, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
