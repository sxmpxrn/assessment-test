import { getSupabaseClient } from "@/lib/supabase/supabase";
import { getSessionToken } from "@/app/component/action";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default async function DashboardTeacher() {
  const session = await getSessionToken();
  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseClient(session);
  // 1. ดึง ID ของอาจารย์จาก Session (RPC: get_my_db_id)
  const { data: teacherDbId, error: idError } = await supabase.rpc("get_my_db_id");

  if (idError || !teacherDbId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            ไม่พบข้อมูลผู้ใช้งาน
          </h2>
          <p className="text-gray-600">Session อาจหมดอายุ หรือเกิดข้อผิดพลาด</p>
          <div className="mt-6">
            <form
              action={async () => {
                "use server";
                redirect("/login");
              }}
            >
              <button className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer">
                กลับไปยังหน้าเข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. ดึงข้อมูล Profile อาจารย์
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .single();

  // 3. ดึงข้อมูลห้องที่ดูแล (ผ่าน teacher_relationship)
  const { data: roomData, error: roomError } = await supabase
    .from("teacher_relationship")
    .select("rooms(id, room_code)")

  // แปลงโครงสร้างข้อมูลห้อง
  const rooms = roomData?.map((r: any) => r.rooms).filter(Boolean) || [];

  // 4. Fetch Comments Data
  // 4.1 Get Current Round
  const { data: roundData } = await supabase
    .from('assessment_head')
    .select('around_id')
    .order('around_id', { ascending: false })
    .limit(1)
    .single();
  const currentRound = roundData?.around_id;

  // 4.2 Get Text Questions & Answers
  let globalTextAnswers: { question: string; answers: string[] }[] = [];

  if (currentRound && teacherDbId) {
    // Fetch Questions
    const { data: questions } = await supabase
      .from('assessment_detail')
      .select('id, detail')
      .eq('around_id', currentRound);

    // Fetch Answers
    const { data: textAnswers } = await supabase
      .from('assessment_answer')
      .select('question_id, text_value')
      .eq('around_id', currentRound)
      .eq('teacher_id', teacherDbId)
      .not('text_value', 'is', null);

    if (questions && textAnswers) {
      const questionMap = new Map(questions.map(q => [q.id, q.detail]));
      const grouped = new Map<number, string[]>();

      textAnswers.forEach(a => {
        if (a.text_value) {
          if (!grouped.has(a.question_id)) grouped.set(a.question_id, []);
          grouped.get(a.question_id)?.push(a.text_value);
        }
      });

      grouped.forEach((answers, qId) => {
        const qText = questionMap.get(qId);
        if (qText) {
          globalTextAnswers.push({ question: qText, answers });
        }
      });
    }
  }

  if (teacherError || !teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            ไม่พบข้อมูลอาจารย์
          </h2>
          <p className="text-gray-600">รหัสอ้างอิง: {teacherDbId}</p>
          <p className="text-gray-500 text-sm mt-2">{teacherError?.message}</p>
          <div className="mt-6">
            <form
              action={async () => {
                "use server";
                redirect("/login");
              }}
            >
              <button className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer">
                กลับไปยังหน้าเข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto animate-fade-up">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white p-8 md:p-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
            <div className="w-32 h-32 bg-linear-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-xl">
              {teacher.teacher_name?.[0] || "T"}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
                ยินดีต้อนรับ,{" "}
                <span className="text-indigo-600 text-3xl">
                  {teacher.teacher_name}
                </span>
              </h1>
              <p className="text-gray-500 font-medium text-lg uppercase tracking-wider">
                Dashboard อาจารย์
              </p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <InfoCard
              label="รหัสอาจารย์"
              value={teacher.teacher_id}
              icon="🆔"
            />
            <InfoCard
              label="ชื่อ-นามสกุล"
              value={teacher.teacher_name}
              icon="👤"
            />

            {/* Rooms Info */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-1">🏫</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    ห้องเรียนที่ดูแล (Responsible Rooms)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rooms && rooms.length > 0 ? (
                      rooms.map((r: any) => (
                        <span key={r.id} className="inline-flex items-center px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-sm font-bold">
                          ห้อง {r.room_code}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic">ไม่มีข้อมูลห้องเรียน</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {globalTextAnswers.length > 0 && (
            <section className="mb-12 animate-fade-in-up space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">ความคิดเห็นและข้อเสนอแนะ</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">รายละเอียดความคิดเห็นจากผู้ประเมิน</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {globalTextAnswers.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col group hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                    <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 p-6 sm:p-8">
                      <h4 className="font-black text-slate-800 flex items-start gap-4 leading-tight text-lg">
                        <span className="mt-1.5 w-3 h-3 rounded-full bg-blue-600 shrink-0 shadow-lg shadow-blue-200 ring-2 ring-blue-50" />
                        {item.question}
                      </h4>
                    </div>
                    <div className="p-6 sm:p-8">
                      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                        {item.answers.map((ans, i) => (
                          <div key={i} className="bg-slate-50/50 p-5 sm:p-6 rounded-[24px] rounded-tl-sm border border-slate-100 text-slate-600 text-sm font-medium relative group/comment hover:bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                            <span className="absolute -left-2 -top-2 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full opacity-0 group-hover/comment:opacity-100 transition-all scale-50 group-hover/comment:scale-100 shadow-lg shadow-blue-200">
                              <MessageSquare size={14} fill="currentColor" stroke="none" />
                            </span>
                            <span className="leading-relaxed relative z-10 block pl-2">"{ans}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mb-12">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">🚀</span> จัดการข้อมูล
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard-teacher/advisory-class"
                className="group flex items-center justify-between p-6 bg-linear-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 hover:border-indigo-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    🏫
                  </div>
                  <div>
                    <span className="block font-bold text-gray-800 text-lg">
                      ห้องเรียนที่ดูแล
                    </span>
                    <span className="text-sm text-gray-500">
                      จัดการรายชื่อนักเรียนและข้อมูลห้อง
                    </span>
                  </div>
                </div>
                <div className="text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100">
            <div className="flex justify-center">
              <form
                action={async () => {
                  "use server";
                  redirect("/login");
                }}
              >
                <button
                  type="submit"
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-gray-200 cursor-pointer"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-lg font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
