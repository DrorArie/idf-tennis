import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/sessions'

// Back from Google. Brand-new accounts are tagged as tennis signups so the
// matchmaker app (same login) keeps them out of its emails and stats.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    const user = data?.user
    if (!error && user) {
      const meta = user.user_metadata ?? {}
      const isNew = Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000
      if (isNew && !meta.signup_app) {
        await createAdminClient().auth.admin.updateUserById(user.id, {
          user_metadata: { ...meta, signup_app: 'idf-tennis.vercel.app' },
        })
      }
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?reason=oauth`)
}
