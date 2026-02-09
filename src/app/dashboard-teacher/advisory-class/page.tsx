import { getSessionToken } from "@/app/component/action";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Building2,
  Search,
} from "lucide-react";

export default async function AdvisoryClass({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string }>;
}) {
  const session = await getSessionToken();
  const { room_id } = await searchParams;

  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseClient(session);

  // 1. Teacher ID
  const { data: teacherDbId } = await supabase.rpc("get_my_db_id");
  if (!teacherDbId) redirect("/login");

  // 2. Teacher Profile
  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .single();

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ไม่พบข้อมูลอาจารย์
          </h2>
          <p className="text-gray-500 mb-6">
            ไม่พบข้อมูลของคุณในระบบ
            กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบสิทธิ์การเข้าถึง
          </p>
          <Link
            href="/dashboard-teacher"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // 3. Related Rooms
  const { data: relData } = await supabase
    .from("teacher_relationship")
    .select("rooms(id, room_code)")

  const rooms = relData?.map((r: any) => ({
    id: r.rooms.id,
    room_code: r.rooms.room_code,
    room_name: r.rooms.room_code, // Fallback
    building: ""
  })) || [];

  // 4. Students if room selected
  let students = null;
  let selectedRoom = null;

  if (room_id) {
    selectedRoom = rooms.find((r: any) => r.id === Number(room_id));

    if (selectedRoom) {
      const { data: studentsData } = await supabase
        .from("students") // <--- Use the View here
        .select("*")
        .eq("room_id", Number(room_id));
      students = studentsData || [];
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {!room_id ? (
          <>
            {/* Main Rooms Page */}
            <div className="mb-10">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                ห้องเรียนที่ดูแล
              </h1>
              <p className="text-gray-500 font-medium text-lg">
                รายชื่อห้องเรียนที่คุณเป็นที่ปรึกษาหรือรับผิดชอบ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms && rooms.length > 0 ? (
                rooms.map((room: any, index: number) => {
                  return (
                    <div
                      key={index}
                      className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                          🏫
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">
                            ข้อมูลห้องเรียน
                          </span>
                          <span className="text-2xl font-black text-gray-800 group-hover:text-indigo-600 transition-colors">
                            {room?.room_name ||
                              `ห้อง ${room?.room_code || "N/A"}`}
                          </span>
                          {room?.building && (
                            <span className="mt-2 text-gray-500 flex items-center gap-2 font-medium">
                              <Building2
                                size={16}
                                className="text-indigo-400"
                              />{" "}
                              {room.building}
                            </span>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-50 mt-2">
                          <Link
                            href={`/dashboard-teacher/advisory-class?room_id=${room.id}`}
                            className="block w-full py-3 bg-gray-50 text-gray-600 text-center rounded-xl font-bold hover:bg-gray-900 hover:text-white transition-all duration-300 text-sm"
                          >
                            ดูรายละเอียดนักเรียน
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    ยังไม่มีห้องเรียนที่ดูแล
                  </h3>
                  <p className="text-gray-400">
                    หากคุณมีห้องเรียนที่เป็นที่ปรึกษา
                    โปรดติดต่อเจ้าหน้าที่เพื่อเพิ่มข้อมูล
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Student List View */}
            <div className="mb-8">
              <Link
                href="/dashboard-teacher/advisory-class"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors mb-6 group"
              >
                <ArrowLeft
                  size={20}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                <span>กลับไปหน้าห้องเรียน</span>
              </Link>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Room Details
                    </span>
                    <span className="text-gray-400 font-bold">•</span>
                    <span className="text-gray-500 font-bold">
                      {selectedRoom?.building || "ไม่ระบุอาคาร"}
                    </span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                    {selectedRoom?.room_name ||
                      `ห้อง ${selectedRoom?.room_code}`}
                  </h1>
                </div>

                <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6">
                  <div className="text-center">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Total Students
                    </span>
                    <span className="text-2xl font-black text-indigo-600">
                      {students?.length || 0}
                    </span>
                  </div>
                  <div className="w-px h-10 bg-gray-100"></div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <GraduationCap size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Student Table/Grid */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                        รหัสนักศึกษา
                      </th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                        ชื่อ-นามสกุล
                      </th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
                        สถานะสิทธิ์
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students && students.length > 0 ? (
                      students.map((student: any) => (
                        <tr
                          key={student.id}
                          className="hover:bg-indigo-50/30 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <span className="font-mono font-bold text-gray-600 group-hover:text-indigo-600">
                              {student.student_id}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                <User size={18} />
                              </div>
                              <span className="font-bold text-gray-800">
                                {student.student_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100 uppercase tracking-widest">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center">
                            <div className="text-4xl mb-4 grayscale opacity-50">
                              👥
                            </div>
                            <p className="text-gray-400 font-bold">
                              ไม่พบข้อมูลนักเรียนในห้องนี้
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
