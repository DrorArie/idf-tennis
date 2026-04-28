import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This function is no longer used. Waitlist promotion is now handled
// automatically by the cancel API (no pending_confirmation flow).
serve(async (_req) => {
  return new Response(
    JSON.stringify({ message: 'no-op: waitlist expiry removed' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
