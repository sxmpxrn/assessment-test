import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Use NEXT_PUBLIC_SUPABASE_URL for consistency with client configs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase Env Vars in Login Route");
      return NextResponse.json({ message: 'Server Configuration Error' }, { status: 500 });
    }

    // Connect DB (Service Role needed for secure RPC)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call SQL Function: login_user
    const { data, error } = await supabase.rpc('login_user', {
      _username: username,
      _password: password
    });

    if (error) {
      console.error("Login RPC Error:", error);
      return NextResponse.json({ message: 'Database Error', details: error.message }, { status: 500 });
    }

    // Validate response data
    if (!data || !Array.isArray(data) || data.length === 0 || data[0].status === 'error') {
      return NextResponse.json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const user = data[0]; // { status, session_token, role_name, user_db_id }

    // Return Success
    const response = NextResponse.json({
      status: 'success',
      role_name: user.role_name,
      token: user.session_token
    });

    // Set Cookie with correct name 'jupagaba'
    response.cookies.set('jupagaba', user.session_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 1 Day
    });

    return response;

  } catch (err: any) {
    console.error("Login Route Exception:", err);
    return NextResponse.json({ message: 'Internal Server Error', error: err.message }, { status: 500 });
  }
}