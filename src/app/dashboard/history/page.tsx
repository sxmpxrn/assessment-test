"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { getSessionToken } from "@/app/component/action";
import {
  History,
  Calendar,
  Search,
  Loader2,
  CheckCircle2,
  LayoutList,
} from "lucide-react";

type HistoryItem = {
  around: number;
  teacher_id: number;
  teacher_name: string;
  status: boolean;
};

const parseAroundId = (aroundId: number) => {
  const idStr = String(aroundId);
  if (idStr.length < 5) return { year: idStr, termLabel: "N/A" };
  const year = idStr.substring(0, 4);
  const term = idStr.substring(4);
  let termLabel = `เทอม ${term}`;
  if (term === "3") termLabel = "ฤดูร้อน (3)";
  return { year, termLabel };
};

// ❌ ลบ async ออกจาก function หลัก
export default function AssessmentHistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // ✅ 1. ดึง Token ใน useEffect
        const token = await getSessionToken();

        if (!token) {
          router.push("/login");
          return;
        }

        // ✅ 2. สร้าง Client ใน useEffect
        const supabase = getSupabaseClient(token);

        // ✅ 3. ดึงข้อมูล Student
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .single();

        if (studentError) {
          console.error("Error fetching student:", studentError);
          setLoading(false);
          return;
        }

        if (student) {
          // ✅ 4. ดึงประวัติการประเมิน (ดึงเฉพาะ ID ก่อนเพื่อเลี่ยงปัญหา Join)
          const { data: answers, error: answersError } = await supabase
            .from("assessment_answer")
            .select(`
              around_id, 
              teacher_id
            `)
            .eq("student_id", student.id);

          if (answersError) {
            console.error("Error fetching answers:", answersError);
          }

          if (answers && answers.length > 0) {
            // Grouping Logic (กรองข้อมูลซ้ำ เพราะ 1 การประเมิน มีหลายข้อคำถาม)
            // ใช้ Map เพื่อเก็บรายการที่ไม่ซ้ำตาม around_id + teacher_id
            const uniqueHistoryMap = new Map<string, { around: number; teacher_id: number }>();
            const teacherIds = new Set<number>();

            answers.forEach((item: any) => {
              const aroundVal = item.around_id; // มั่นใจว่าใช้ column นี้
              const key = `${aroundVal}-${item.teacher_id}`;

              if (!uniqueHistoryMap.has(key)) {
                uniqueHistoryMap.set(key, {
                  around: aroundVal,
                  teacher_id: item.teacher_id,
                });
                teacherIds.add(item.teacher_id);
              }
            });

            // ✅ 5. ดึงชื่ออาจารย์แยกต่างหาก
            let teacherMap = new Map<number, string>();
            if (teacherIds.size > 0) {
              const { data: teachersData } = await supabase
                .from("teachers")
                .select("id, teacher_name")
                .in("id", Array.from(teacherIds));

              if (teachersData) {
                teachersData.forEach((t) => {
                  teacherMap.set(t.id, t.teacher_name);
                });
              }
            }

            // ✅ 6. รวมข้อมูล
            const finalHistory: HistoryItem[] = Array.from(uniqueHistoryMap.values()).map(
              (item) => ({
                around: item.around,
                teacher_id: item.teacher_id,
                teacher_name: teacherMap.get(item.teacher_id) || "ไม่ระบุชื่อ",
                status: true,
              })
            );

            // เรียงลำดับตามปีการศึกษาล่าสุด
            setHistory(finalHistory.sort((a, b) => b.around - a.around));
          } else {
            setHistory([]);
          }
        }
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const filteredHistory = history.filter(
    (item) =>
      item.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.around).includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-gray-500">
        <Loader2 size={32} className="animate-spin text-[#C1322E]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 sm:px-6 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="bg-[#C1322E]/10 p-2.5 rounded-xl text-[#C1322E]">
              <History size={28} />
            </span>
            ประวัติการประเมิน
          </h1>
          <p className="text-gray-500 mt-2 ml-1 text-sm md:text-base">
            รายการประเมินอาจารย์ที่ปรึกษาที่คุณได้ดำเนินการเสร็จสิ้นแล้ว
          </p>
        </div>

        {/* Simple Search */}
        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="ค้นหาอาจารย์ หรือ ภาคเรียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 pl-11 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#C1322E]/20 focus:border-[#C1322E] outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* CONTENT */}
      {history.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutList size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">ยังไม่มีประวัติการประเมิน</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          ไม่พบข้อมูลที่ค้นหา
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((item) => {
            const { year, termLabel } = parseAroundId(item.around);
            return (
              <div
                key={`${item.around}-${item.teacher_id}`}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#C1322E]/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CheckCircle2 size={64} className="text-[#C1322E]" />
                </div>

                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 size={12} />
                    เสร็จสิ้น
                  </span>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    {item.around}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-[#C1322E] transition-colors">
                  {item.teacher_name}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <Calendar size={16} className="text-gray-400" />
                  {year} / {termLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}