import { createAdminClient } from '@/lib/sessions'

// IDF personal number (מספר אישי): digits only, 7–8 long.
export function cleanIdfNumber(raw: unknown): string | null {
  const v = String(raw ?? '').replace(/[\s-]/g, '')
  return /^\d{7,8}$/.test(v) ? v : null
}

// Returns an error message, or null if the number is valid and not taken by someone else.
export async function checkIdfNumber(raw: unknown, userId?: string): Promise<{ value: string } | { error: string }> {
  const value = cleanIdfNumber(raw)
  if (!value) return { error: 'מספר אישי לא תקין — 7 או 8 ספרות' }
  let q = createAdminClient().from('tennis_profiles').select('id', { count: 'exact', head: true }).eq('idf_number', value)
  if (userId) q = q.neq('id', userId)
  const { count } = await q
  if ((count ?? 0) > 0) return { error: 'המספר האישי הזה כבר רשום. לבירור פנה/י למנהל האימונים.' }
  return { value }
}
