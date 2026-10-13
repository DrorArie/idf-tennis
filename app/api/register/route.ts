import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/sessions'
import { checkIdfNumber } from '@/lib/idf'

// The login is shared with Dror's other apps (one Supabase project), which asks new
// people to confirm their email. Tennis never did, so the account is created here
// already confirmed and tagged as a tennis signup (keeps it out of the matchmaker
// app's emails and stats). The page signs in right after.
export async function POST(req: NextRequest) {
  const { email, password, name, phone, idf_number, skill_level, service_type } = await req.json()

  if (!email?.trim() || !password || !name?.trim() || !phone?.trim() || !skill_level || !service_type) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: 'הסיסמה צריכה להכיל לפחות 6 תווים' }, { status: 400 })
  }
  if (!['beginner', 'amateur', 'expert_a', 'expert_b'].includes(skill_level)) {
    return NextResponse.json({ error: 'רמת משחק לא תקינה' }, { status: 400 })
  }
  if (!['keva', 'ezrach'].includes(service_type)) {
    return NextResponse.json({ error: 'סוג שירות לא תקין' }, { status: 400 })
  }

  const idf = await checkIdfNumber(idf_number)
  if ('error' in idf) return NextResponse.json({ error: idf.error }, { status: 400 })

  const admin = createAdminClient()
  const { data, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: name.trim(), signup_app: 'idf-tennis.vercel.app' },
  })
  if (authError || !data.user) {
    const exists = authError?.code === 'email_exists' || /already|registered|exists/i.test(authError?.message ?? '')
    return NextResponse.json(
      {
        error: exists
          ? 'כבר קיים חשבון עם האימייל הזה (אולי מאפליקציה אחרת של דרור) — התחבר/י עם הסיסמה שלו'
          : 'ההרשמה נכשלה, נסה/י שוב',
      },
      { status: 400 }
    )
  }

  const { error } = await admin.from('tennis_profiles').insert({
    id: data.user.id,
    name: name.trim(),
    phone: phone.trim(),
    idf_number: idf.value,
    skill_level,
    service_type,
    email: data.user.email,
  })

  if (error) {
    console.error('Profile insert error:', error)
    await admin.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'שגיאה ביצירת הפרופיל' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
