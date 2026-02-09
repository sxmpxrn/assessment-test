import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

// ฟังก์ชันสำหรับสร้าง Client โดยรับ Token เข้ามา
export const getSupabaseClient = (sessionToken?: string | null) => {
  const headers: Record<string, string> = {}

  // ⭐️ จุดสำคัญ: ถ้ามี Token ให้แนบไปใน Header ชื่อ 'x-session-id'
  if (sessionToken) {
    headers['x-session-id'] = sessionToken
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: headers,
    },
  })
}