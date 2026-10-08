import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/sessions'

// Creates the profile for the account that was just signed up (and is now signed in).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ההרשמה לא הושלמה — נסה להתחבר' }, { status: 401 })

  const { name, phone, skill_level, service_type } = await req.json()

  if (!name?.trim() || !phone?.trim() || !skill_level || !service_type) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }
  if (!['beginner', 'amateur', 'expert_a', 'expert_b'].includes(skill_level)) {
    return NextResponse.json({ error: 'רמת משחק לא תקינה' }, { status: 400 })
  }
  if (!['keva', 'ezrach'].includes(service_type)) {
    return NextResponse.json({ error: 'סוג שירות לא תקין' }, { status: 400 })
  }

  const { error } = await createAdminClient().from('profiles').insert({
    id: user.id,
    name: name.trim(),
    phone: phone.trim(),
    skill_level,
    service_type,
    email: user.email,
  })

  if (error) {
    console.error('Profile insert error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת הפרופיל' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
