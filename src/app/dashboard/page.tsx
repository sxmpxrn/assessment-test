"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import {
  User,
  Mail,
  MapPin,
  BookOpen,
  GraduationCap,
  IdCard,
  Loader2,
  Calendar,
  Phone,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRoundId } from "@/lib/utils/round-formatter";
import { getSessionToken } from "@/app/component/action";

type AssessmentStatus = {
  aroundId: number;
  termLabel: string;
  advisorName: string;
  advisorId: number;
  isCompleted: boolean;
};

export default function Profile() {

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatus[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const token = await getSessionToken();
        if (!token) {
          window.location.href = '/login'
          return
        }

        const supabase = getSupabaseClient(token);
        setLoading(true);

        // 2. Fetch Student ID
        const { data: userId, error: rpcError } = await supabase.rpc("get_my_db_id");
        if (rpcError || !userId) {
          console.error("RPC Error or No User ID:", rpcError);
          // Handle auth failure (optional redirect or showing empty state)
          setLoading(false);
          return;
        }
        console.log("Logged in User ID:", userId);

        // 3. Fetch Student Base Data
        const { data: stdData, error: stdError } = await supabase
          .from("students")
          .select("*")
          .eq('id', userId)
          .single();

        console.log("Student Data Fetch Result:", { stdData, stdError });

        if (stdError) {
          console.error("Error fetching student base data:", JSON.stringify(stdError, null, 2));
        } else if (stdData) {
          // 4. Fetch Relations manually to avoid Join issues
          let roomInfo: any = null;
          let majorName = "-";
          let facultyName = "-";
          const roomId = stdData.room_id;

          if (roomId) {
            const { data: roomData } = await supabase
              .from("rooms")
              .select(`
                id,
                room_code,
                majors (
                  major_name,
                  faculties (
                    faculty_name
                  )
                )
              `)
              .eq('id', roomId)
              .single();

            if (roomData) {
              roomInfo = roomData;
              // @ts-ignore
              majorName = roomData.majors?.major_name || "-";
              // @ts-ignore
              facultyName = roomData.majors?.faculties?.faculty_name || "-";
            }
          }

          // 5. Fetch Advisors
          let advisors: any[] = [];

          // RLS Policy "Student View My Teachers" handles the filtering
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("id, teacher_name");

          if (teacherData) {
            advisors = teacherData;
          }

          // Create comma-separated list of advisors
          const advisorNames = advisors.length > 0
            ? advisors.map((a: any) => a.teacher_name).join(", ")
            : "ยังไม่มีอาจารย์ที่ปรึกษา";

          const processedData = {
            ...stdData,
            room_code: roomInfo?.room_code || "ยังไม่อยู่ในห้อง",
            major_name: majorName,
            faculty_name: facultyName,
            advisor_name: advisorNames,
            advisors_list: advisors,
          };

          setStudent(processedData);

          // 4. Check Assessment Status
          const now = new Date().toISOString();

          // A. Get Active Rounds
          const { data: details } = await supabase
            .from("assessment_detail")
            .select("around_id, start_date, end_date")
            .lte("start_date", now)
            .gte("end_date", now);

          if (details && details.length > 0) {
            // Unique rounds
            const uniqueRoundsMap = new Map();
            details.forEach((d: any) => {
              if (!uniqueRoundsMap.has(d.around_id)) {
                uniqueRoundsMap.set(d.around_id, d);
              }
            });
            const activeRounds = Array.from(uniqueRoundsMap.values());

            const statusList: AssessmentStatus[] = [];

            for (const round of activeRounds as any[]) {
              // Parse Round Label
              const termLabel = formatRoundId(round.around_id);

              for (const advisor of advisors) {
                // Check if this student has already assessed THIS advisor in THIS round
                const { count } = await supabase
                  .from("assessment_answer")
                  .select("*", { count: "exact", head: true })
                  .eq("student_id", userId)
                  .eq("teacher_id", advisor.id)
                  .eq("around_id", round.around_id)
                  .limit(1);

                statusList.push({
                  aroundId: round.around_id,
                  termLabel,
                  advisorName: advisor.teacher_name,
                  advisorId: advisor.id,
                  isCompleted: count ? count > 0 : false,
                });
              }
            }
            setAssessmentStatus(statusList);
          }
        }
      } catch (err) {
        console.error("Error in profile fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 size={40} className="animate-spin mb-4 text-ksu" />
        <p className="font-medium animate-pulse">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center max-w-md">
          <ShieldCheck className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-red-700 mb-2">
            ไม่พบข้อมูลนักศึกษา
          </h2>
          <p className="text-red-600">
            ขออภัย ไม่พบข้อมูลนักศึกษาในระบบ หรือเกิดข้อผิดพลาดในการดึงข้อมูล
          </p>
        </div>
      </div>
    );
  }

  const pendingCount = assessmentStatus.filter(s => !s.isCompleted).length;

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 pt-10 animate-fade-up">
      {/* Header Profile Card */}
      <div className="relative mb-8 pt-20">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-ksu to-ksu-dark rounded-3xl -z-10 shadow-lg"></div>
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-ksu -mt-24 md:-mt-20 overflow-hidden shrink-0">
            {student.profile_url ? (
              <img
                src={student.profile_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={80} strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 text-center md:text-left pb-2">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
              {student.student_name}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-500 font-medium">
              <span className="flex items-center gap-1.5 bg-ksu-light px-3 py-1 rounded-full text-ksu text-sm font-bold">
                <IdCard size={16} />
                {student.student_id}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <BookOpen size={16} />
                ห้อง {student.room_code}
              </span>
            </div>
          </div>
          <div className="md:pb-4">
            <span
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${student.citizen_id
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
            >
              {student.citizen_id ? "ยืนยันตัวตนแล้ว" : "ข้อมูลไม่สมบูรณ์"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Education */}
        <div className="lg:col-span-2 space-y-8">

          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-ksu-light rounded-lg text-ksu">
                <GraduationCap size={20} />
              </div>
              ข้อมูลทั่วไป
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <InfoItem label="ชื่อ-นามสกุล" value={student.student_name} />
              <InfoItem label="รหัสนักศึกษา" value={student.student_id} />
              <InfoItem label="คณะ" value={student.faculty_name} />
              <InfoItem label="สาขาวิชา" value={student.major_name} />
              <InfoItem label="เลขบัตรประชาชน" value={student.citizen_id} />
              <InfoItem
                label="อาจารย์ที่ปรึกษา"
                value={
                  student.advisors_list && student.advisors_list.length > 0 ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      {student.advisors_list.map((adv: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-ksu/60 shrink-0"></div>
                          <span>{adv.teacher_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    "ยังไม่มีอาจารย์ที่ปรึกษา"
                  )
                }
              />
            </div>
          </div>

          {/* ASSESSMENT ALERT CARD - Only show if there are active assessments */}
          {assessmentStatus.length > 0 && (
            <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${pendingCount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                    <ClipboardList size={20} />
                  </div>
                  การประเมินที่เปิดอยู่ขณะนี้
                </h2>
                {pendingCount > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    รอการดำเนินการ {pendingCount} รายการ
                  </span>
                )}
              </div>

              <div className="p-6 space-y-4">
                {assessmentStatus.map((status, index) => (
                  <div key={`${status.aroundId}-${status.advisorId}`} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-ksu/30 transition-all shadow-sm">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-gray-900">{status.termLabel}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <User size={14} /> อาจารย์: {status.advisorName}
                      </div>
                    </div>

                    {status.isCompleted ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <CheckCircle2 size={16} />
                        ประเมินแล้ว
                      </div>
                    ) : (
                      <Link href="/dashboard/assessment-advisor" className="flex items-center gap-2 text-white bg-ksu hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-transform active:scale-95 shadow-md shadow-red-200">
                        <AlertCircle size={16} />
                        ทำแบบประเมิน
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Contact & Misc */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              ข้อมูลผู้ดูแล
            </h2>
            <div className="space-y-6">
              <ContactItem
                icon={<User size={18} />}
                label="ชื่ออาจารย์ที่ปรึกษา"
                value={
                  student.advisors_list && student.advisors_list.length > 0 ? (
                    <div className="flex flex-col gap-1 mt-0.5">
                      {student.advisors_list.map((adv: any, i: number) => (
                        <div key={i}>{adv.teacher_name}</div>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )
                }
              />
              <ContactItem
                icon={<Mail size={18} />}
                label="อีเมล"
                value="-"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
        {label}
      </p>
      <div className="text-lg font-semibold text-gray-800">{value || "-"}</div>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-semibold text-gray-700 break-all">{value || "-"}</div>
      </div>
    </div>
  );
}
