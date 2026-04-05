import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses service role key to bypass RLS — safe because we validate the data here
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, name, phone, idf_number, skill_level } = await req.json()

  if (!userId || !name || !phone || !idf_number || !skill_level) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }

  if (!/^\d{7}$/.test(idf_number)) {
    return NextResponse.json({ error: 'מספר אישי חייב להיות 7 ספרות' }, { status: 400 })
  }

  const validLevels = ['beginner', 'amateur', 'expert_a', 'expert_b']
  if (!validLevels.includes(skill_level)) {
    return NextResponse.json({ error: 'רמת משחק לא תקינה' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    name,
    phone,
    idf_number,
    skill_level,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
