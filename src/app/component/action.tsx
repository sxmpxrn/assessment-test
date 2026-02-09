'use server'
import { cookies } from 'next/headers'
import { getSupabaseClient } from '@/lib/supabase/supabase';

export async function getSessionToken() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jupagaba')
  return token?.value
}

export async function logout() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jupagaba')?.value

  if (token) {
    const supabase = getSupabaseClient(token)
    // Attempt to delete session from DB
    // Assuming 'sessions' table has 'session_token' column as per typical setup in this conversation context
    // Or check if there is an RPC. The user said "in supabase.session" -> likely 'sessions' table.
    // Previous context mentioned "delete a session from the 'sessions' table".
    try {
      await supabase.from('sessions').delete().eq('session_token', token)
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  // Delete cookie
  cookieStore.delete('jupagaba')
}
