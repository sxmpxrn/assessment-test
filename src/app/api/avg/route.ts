import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/supabase'
import { getSessionToken } from '@/app/component/action'

// Helper Function: ตรวจสอบว่าเป็น Admin หรือไม่
async function checkIsAdmin(supabase: any) {
  // เรียกฟังก์ชัน Database เพื่อเช็ค Role ID ของคนปัจจุบัน
  // หรือเช็คจากตาราง admins โดยตรง
  try {
    // วิธีที่ 1: เช็คผ่าน RPC get_current_role_id (ถ้ามี)
    const { data: roleId, error } = await supabase.rpc('get_current_role_id');
    
    if (!error && roleId === 1) return true;

    // วิธีที่ 2 (Fallback): เช็ค Manual ว่า session user ตรงกับ admin table ไหม
    // (ใช้กรณีไม่มี rpc หรือ rpc มีปัญหา)
    /* const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: admin } = await supabase.from('admins').select('id').eq('auth_id', user.id).single();
    return !!admin;
    */
   
    return false; // ถ้าเช็คไม่ได้ ให้ตีเป็นไม่ใช่ Admin ไว้ก่อน
  } catch (e) {
    return false;
  }
}

async function runCalculations(around_id: number, triggered_by: string, token?: string) {
  const supabase = getSupabaseClient(token)

  // 🛡️ SECURITY: ตรวจสอบสิทธิ์ Admin ก่อนรัน
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    console.warn(`Unauthorized calculation attempt by: ${triggered_by}`);
    return {
      success: false,
      message: 'Access Denied: คุณไม่มีสิทธิ์ในการสั่งคำนวณผล (Admin Only)',
      status: 403
    };
  }

  console.log('Running calculations with:', { around_id, triggered_by })

  // 1. Check if answers exist (เช็คว่ามีคำตอบให้คำนวณไหม)
  const { count, error: countError } = await supabase
    .from('assessment_answer')
    .select('*', { count: 'exact', head: true })
    .eq('around_id', around_id);

  if (countError) {
    console.error("Count Check Error:", countError);
    return { success: false, message: 'Database Error: ' + countError.message, status: 500 };
  }

  if (count === 0) {
    return {
      success: false, // เปลี่ยนเป็น false เพื่อบอกว่าไม่ได้ทำอะไร
      message: `ไม่พบข้อมูลการประเมินในรอบ ${around_id} จึงไม่มีการคำนวณ`,
      status: 404
    };
  }

  // 2. Run RPC Calculations
  // ❌ ไม่ต้อง Delete ข้อมูลเก่าแล้ว เพราะ SQL Function ใช้ ON CONFLICT UPDATE
  console.log(`Triggering DB Functions for around_id: ${around_id}...`);

  // เรียก 3 ฟังก์ชันพร้อมกัน (Parallel)
  const [resTeacher, resMajor, resFaculty] = await Promise.all([
    supabase.rpc('run_calculate_avg_teacher', { p_around_id: around_id, p_triggered_by: triggered_by }),
    supabase.rpc('run_calculate_avg_major', { p_around_id: around_id, p_triggered_by: triggered_by }),
    supabase.rpc('run_calculate_avg_faculty', { p_around_id: around_id, p_triggered_by: triggered_by }),
  ]);

  // รวบรวม Error (ถ้ามี)
  const errors = [];
  if (resTeacher.error) errors.push(`Teacher Calc Error: ${resTeacher.error.message}`);
  if (resMajor.error) errors.push(`Major Calc Error: ${resMajor.error.message}`);
  if (resFaculty.error) errors.push(`Faculty Calc Error: ${resFaculty.error.message}`);

  if (errors.length > 0) {
    console.error('Calculation Errors:', errors);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการคำนวณบางส่วน',
      errors: errors,
      status: 500
    };
  }

  return {
    success: true,
    message: 'ส่งคำสั่งคำนวณเรียบร้อยแล้ว (ตรวจสอบสถานะได้ที่ System Logs)',
    status: 200
  };
}

// --- POST METHOD (แนะนำให้ใช้ Method นี้ในการสั่งคำนวณ) ---
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { around_id, triggered_by } = body

    if (!around_id) {
      return NextResponse.json({ success: false, message: 'Missing around_id' }, { status: 400 })
    }

    const session = await getSessionToken()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const result = await runCalculations(Number(around_id), triggered_by || 'api_manual_trigger', session)
    return NextResponse.json(result, { status: result.status })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}

// --- GET METHOD (เผื่อไว้ Test แต่อาจปิดได้ถ้าต้องการความปลอดภัยสูง) ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const around_id = searchParams.get('around_id')
    
    // Security: บังคับให้ใช้ POST ดีกว่าสำหรับการเปลี่ยนข้อมูล
    // แต่ถ้าจะเปิด GET ไว้ ก็ต้องเช็ค Admin เหมือนกัน
    
    if (!around_id) {
      return NextResponse.json({ success: false, message: 'Missing around_id' }, { status: 400 })
    }

    const session = await getSessionToken()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const result = await runCalculations(Number(around_id), 'api_get_trigger', session)
    return NextResponse.json(result, { status: result.status })

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}