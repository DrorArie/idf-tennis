import type { SupabaseClient } from '@supabase/supabase-js'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  message: string,
): Promise<void> {
  await supabase.from('notifications').insert({ user_id: userId, message })
}
