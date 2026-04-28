import type { SupabaseClient } from '@supabase/supabase-js'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  message: string,
): Promise<void> {
  try {
    await supabase.from('notifications').insert({ user_id: userId, message })
  } catch (err) {
    console.error('Notification creation failed:', err)
  }
}
