"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { getSessionToken } from "@/app/component/action";
import {
  Calendar,
  ClipboardList,
  Info,
  Loader2,
  Save,
  User,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";
import { parseRoundId, getTermLabel } from "@/lib/utils/round-formatter";

// --- Types ---
type Section = {
  id: number;
  section: string;
  head_description: string;
  description: string | null;
  around_id: number;
};

type Question = {
  id: number;
  type: "scale" | "text" | "head";
  question_text: string;
  start_score: number | null;
  end_score: number | null;
  around_id: number;
  section: string;
};

type AssessmentRound = {
  around_id: number;
  start_date: string;
  end_date: string;
};

// --- Utils ---
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = (date.getFullYear() + 543).toString();
  return `${day}/${month}/${year}`;
};

const getStatus = (startDateString: string, endDateString: string) => {
  const now = new Date();
  const start = new Date(startDateString);
  const end = new Date(endDateString);

  if (now < start) {
    return {
      isActive: false,
      label: "ยังไม่เปิด",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
  }

  const isActive = now <= end;
  return {
    isActive,
    label: isActive ? "กำลังดำเนินการ" : "หมดเวลา",
    color: isActive
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-gray-100 text-gray-600 border-gray-200",
  };
};

// --- Main Component ---
// 1. ลบ async ออกจาก function หลัก
export default function AssessmentAdvisorPage() {
  const router = useRouter();

  // State สำหรับเก็บ Supabase Client หลังจากได้ Token
  const [supabase, setSupabase] = useState<any>(null);

  const [view, setView] = useState<"dashboard" | "form">("dashboard");

  // User State
  const [studentData, setStudentData] = useState<any>(null);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [isAlreadyAssessed, setIsAlreadyAssessed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard State
  const [rounds, setRounds] = useState<AssessmentRound[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [completedAssessments, setCompletedAssessments] = useState<string[]>([]); // "aroundId-advisorId"

  // Form State
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAround, setSelectedAround] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});

  // 2. Initialize Supabase Client
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const token = await getSessionToken();
        if (!token) {
          router.push("/login");
          return;
        }
        const client = getSupabaseClient(token);
        setSupabase(client);
      } catch (error) {
        console.error("Error init supabase:", error);
        router.push("/login");
      }
    };
    initSupabase();
  }, [router]);

  // 3. Fetch User Data & Completed Assessments (ทำงานเมื่อมี supabase แล้ว)
  const fetchUserData = useCallback(async () => {
    if (!supabase) return;
    setUserDataLoading(true);

    try {
      // 3.1 Fetch Student and Advisors
      const { data, error } = await supabase
        .from("students")
        .select(
          `
          *,
          rooms!room_id (
            id,
            room_code
          )
        `
        )
        .single();

      if (error) throw error;

      if (data) {
        const room = data.rooms as any;
        let allAdvisors: any[] = [];

        // Fetch Advisors via teacher_relationship table
        if (room?.id) {
          const { data: relationData } = await supabase
            .from("teacher_relationship")
            .select(`
                teachers (
                  id,
                  teacher_name
                )
              `)
            .eq("room_id", room.id);

          if (relationData) {
            allAdvisors = relationData
              .map((item: any) => item.teachers)
              .filter((t: any) => t !== null);
          }
        }

        setAdvisors(allAdvisors);
        if (allAdvisors.length > 0) {
        }

        const student = {
          ...data,
          room_code: room?.room_code || "ยังไม่อยู่ในห้อง",
        };
        setStudentData(student);

        // 3.2 Fetch Completed Assessments
        const { data: assessments } = await supabase
          .from("assessment_answer")
          .select("around_id, teacher_id")
          .eq("student_id", data.id);

        if (assessments) {
          const keys = Array.from(
            new Set(assessments.map((a: any) => `${a.around_id}-${a.teacher_id}`))
          ) as string[];
          setCompletedAssessments(keys);
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setUserDataLoading(false);
    }
  }, [supabase]);

  // Trigger User Data Fetch
  useEffect(() => {
    if (supabase) {
      fetchUserData();
    }
  }, [supabase, fetchUserData]);

  // 4. Fetch Rounds (Dashboard)
  useEffect(() => {
    if (!supabase) return;

    const fetchRounds = async () => {
      setDashboardLoading(true);
      try {
        const { data, error } = await supabase
          .from("assessment_detail")
          .select("around_id, start_date, end_date")
          .order("around_id", { ascending: false });

        if (error) {
          console.error("Error fetching rounds:", error);
        } else if (data) {
          const uniqueRounds = Array.from(
            new Map(data.map((item: any) => [item.around_id, item])).values()
          ) as AssessmentRound[];
          setRounds(uniqueRounds);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setDashboardLoading(false);
      }
    };
    fetchRounds();
  }, [supabase]);

  // 5. Check if already assessed (Form View)
  useEffect(() => {
    const checkExisting = async () => {
      if (supabase && studentData?.id && selectedAdvisorId && selectedAround) {
        const { count, error } = await supabase
          .from("assessment_answer")
          .select("*", { count: "exact", head: true })
          .eq("student_id", studentData.id)
          .eq("teacher_id", selectedAdvisorId)
          .eq("around_id", selectedAround);

        if (!error && count && count > 0) {
          setIsAlreadyAssessed(true);
        } else {
          setIsAlreadyAssessed(false);
        }
      }
    };
    checkExisting();
  }, [studentData?.id, selectedAdvisorId, selectedAround, supabase]);

  // 6. Fetch Form Data
  const fetchAssessmentData = async (aroundId: number) => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Fetch Sections
      const { data: headData, error: headError } = await supabase
        .from("assessment_head")
        .select("*")
        .eq("around_id", aroundId)
        .order("section1", { ascending: true });

      if (headError) throw headError;

      // Fetch Questions
      const { data: detailData, error: detailError } = await supabase
        .from("assessment_detail")
        .select("*")
        .eq("around_id", aroundId)
        .order("section1", { ascending: true })
        .order("section2", { ascending: true });

      if (detailError) throw detailError;

      // Map Sections
      const mappedSections: Section[] = (headData || []).map((h: any) => ({
        id: h.id,
        section: String(h.section1),
        head_description: h.head_description || "",
        description: h.description || "",
        around_id: h.around_id
      }));

      // Map Questions (Fixed Logic)
      const processedQuestions: Question[] = (detailData || []).map((d: any) => ({
        id: d.id,
        type: d.type === 'score' ? 'scale' : d.type,
        question_text: d.detail,
        start_score: d.min_score,
        end_score: d.max_score,
        around_id: d.around_id,
        // สร้าง section string ให้ตรงกับ logic ของ UI เช่น "1.1", "1.2"
        section: `${d.section1}.${d.section2}`
      }));

      if (mappedSections) setSections(mappedSections);
      if (processedQuestions) setQuestions(processedQuestions);

      setView("form");
    } catch (error) {
      console.error("Error fetching assessment details:", error);
      alert("ไม่สามารถโหลดข้อมูลแบบประเมินได้");
      setSelectedAround(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Form Data fetch
  useEffect(() => {
    if (selectedAround && supabase) {
      fetchAssessmentData(selectedAround);
    }
  }, [selectedAround, supabase]);

  const handleSelectRound = (roundId: number, advisorId: number) => {
    setSelectedAdvisorId(advisorId);
    setSelectedAround(roundId);
    // Reset answers when changing round/advisor
    setAnswers({});
    setIsAlreadyAssessed(false);
  };

  const handleBack = () => {
    // แทนที่จะ reload ให้กลับไปหน้า dashboard แล้วโหลดสถานะการประเมินใหม่
    setView("dashboard");
    setSelectedAround(null);
    setSelectedAdvisorId(null);
    fetchUserData(); // Re-fetch completed assessments
  };

  const handleAnswerChange = (qId: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSave = async () => {
    if (!selectedAround || !selectedAdvisorId || !studentData || !supabase) return;

    // Validate
    const scaleQuestions = questions.filter((q) => q.type === "scale");
    const unansweredCount = scaleQuestions.filter((q) => !answers[q.id]).length;

    if (unansweredCount > 0) {
      alert(`กรุณาตอบคำถามให้ครบทุกข้อ (ยังเหลือ ${unansweredCount} ข้อ)`);
      return;
    }

    if (isAlreadyAssessed) {
      alert("ท่านได้ทำการประเมินอาจารย์ท่านนี้ในรอบนี้ไปแล้ว");
      return;
    }

    setIsSubmitting(true);
    try {
      // Double check uniqueness
      const { count: finalCheckCount } = await supabase
        .from("assessment_answer")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentData.id)
        .eq("teacher_id", selectedAdvisorId)
        .eq("around_id", selectedAround);

      if (finalCheckCount && finalCheckCount > 0) {
        alert("ท่านได้ทำการประเมินอาจารย์ท่านนี้ในรอบนี้ไปแล้ว (ตรวจพบข้อมูลซ้ำ)");
        setIsAlreadyAssessed(true);
        setIsSubmitting(false);
        return;
      }

      const records = questions.map((q) => ({
        student_id: studentData.id,
        teacher_id: selectedAdvisorId,
        question_id: q.id,
        score_value: q.type === "scale" ? Number(answers[q.id]) : null,
        text_value: q.type === "text" ? String(answers[q.id] || "") : null,
        around_id: selectedAround,
      }));

      const { error } = await supabase
        .from("assessment_answer")
        .insert(records);

      if (error) throw error;

      alert("บันทึกข้อมูลการประเมินเรียบร้อยแล้ว");

      // กลับหน้าหลัก
      handleBack();

    } catch (err) {
      console.error("Save error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER DASHBOARD ---
  if (view === "dashboard") {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 sm:px-6 font-sans">
        {/* HEADER */}
        <div className="py-8 border-b border-gray-100">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="bg-[#C1322E] text-white p-2 rounded-xl">
              <ClipboardList size={24} />
            </span>
            ประเมินอาจารย์ที่ปรึกษา
          </h1>
          <p className="text-gray-500 mt-3 text-base">
            เลือกอาจารย์ที่ปรึกษาที่ต้องการประเมินจากรายการรอบการประเมินที่เปิดอยู่ด้านล่าง
          </p>
        </div>

        {userDataLoading || dashboardLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-[#C1322E]" />
          </div>
        ) : (
          <div className="space-y-8">
            {rounds.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">ไม่พบรอบการประเมินที่เปิดอยู่</p>
              </div>
            ) : (
              <div className="space-y-6">
                {rounds.map((round) => {
                  const { year, term } = parseRoundId(round.around_id);
                  const termLabel = getTermLabel(term);
                  const status = getStatus(round.start_date, round.end_date);

                  if (!status.isActive) return null;

                  return (
                    <div
                      key={round.around_id}
                      className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100/80 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-gray-900">
                              ปีการศึกษา {year} <span className="text-gray-400 font-normal">|</span> {termLabel}
                            </h2>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar size={14} />
                            {formatDate(round.start_date)} - {formatDate(round.end_date)}
                          </div>
                        </div>
                      </div>

                      {/* Advisors Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {advisors.map((adv) => {
                          const isDone = completedAssessments.includes(
                            `${round.around_id}-${adv.id}`
                          );

                          return (
                            <button
                              key={adv.id}
                              onClick={() =>
                                handleSelectRound(round.around_id, adv.id)
                              }
                              disabled={!status.isActive || isDone}
                              className={`group relative p-4 rounded-2xl border text-left transition-all duration-200
                                ${isDone
                                  ? "bg-emerald-50/50 border-emerald-100 cursor-default opacity-80"
                                  : status.isActive
                                    ? "bg-white border-gray-200 hover:border-[#C1322E] hover:shadow-lg hover:-translate-y-1"
                                    : "bg-gray-50 border-gray-100 cursor-not-allowed opacity-60"
                                }`
                              }
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors
                                   ${isDone ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500 group-hover:bg-red-50 group-hover:text-[#C1322E]"}`}>
                                  {isDone ? <ClipboardCheck size={24} /> : <User size={24} />}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900 group-hover:text-[#C1322E] transition-colors">
                                    {adv.teacher_name}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    {isDone ? (
                                      <span className="text-emerald-600 font-bold">ประเมินเสร็จสิ้น</span>
                                    ) : (
                                      <span className="text-gray-400 group-hover:text-red-400">คลิกเพื่อทำแบบประเมิน</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- RENDER FORM ---
  const { year, term } = parseRoundId(selectedAround || 0);
  const termLabel = getTermLabel(term);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <Loader2 size={40} className="animate-spin mb-4 text-[#C1322E]" />
        <p>กำลังเตรียมข้อมูลแบบประเมิน...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-medium mb-4"
      >
        <ArrowLeft size={18} />
        <span>ย้อนกลับ</span>
      </button>

      {/* ... ส่วนของ Form Rendering (เหมือนเดิม) ... */}
      {/* MAIN HEADER & GENERAL INFORMATION */}
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C1322E] to-red-400"></div>
        <div className="text-center mb-8 border-b border-gray-100 pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            แบบประเมินความพึงพอใจต่ออาจารย์ที่ปรึกษา
          </h1>
          <p className="text-gray-600 font-medium">
            มหาวิทยาลัยกาฬสินธุ์ • Kalasin University
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
            <span>ปีการศึกษา {year}</span>
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span>{termLabel}</span>
          </div>
        </div>

        {/* General Info Grid */}
        <div>
          <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
            <Info size={20} />
            ข้อมูลทั่วไป (General Information)
          </h2>

          {isAlreadyAssessed && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3 animate-pulse">
              <Info size={24} className="shrink-0" />
              <div className="font-bold">
                คุณได้ทำการประเมินอาจารย์ท่านนี้ในรอบการประเมินนี้ไปแล้ว
                ไม่สามารถประเมินซ้ำได้
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
            {/* Advisor Selection */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white rounded-full border border-gray-200 flex items-center justify-center text-[#C1322E] shrink-0">
                <User size={32} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                  อาจารย์ที่ปรึกษา (Advisor)
                </label>
                <p className="text-lg font-bold text-gray-900">
                  {advisors.find((a) => a.id === selectedAdvisorId)
                    ?.teacher_name || "ไม่พบข้อมูลอาจารย์"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {studentData?.std_faculty || "มหาวิทยาลัยกาฬสินธุ์"}
                </p>
              </div>
            </div>

            {/* Student (Evaluator) */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white rounded-full border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                <User size={32} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                  ผู้ประเมิน (Evaluator)
                </label>
                <p className="text-lg font-bold text-gray-900">
                  {studentData?.student_name || "กำลังโหลด..."}
                </p>
                <p className="text-sm text-gray-600">
                  รหัสนักศึกษา: {studentData?.student_id || "กำลังโหลด..."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 text-sm border border-yellow-100 rounded-lg flex gap-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              คำชี้แจง:
              ข้อมูลของท่านจะถูกเก็บเป็นความลับและนำไปใช้เพื่อการพัฒนาและปรับปรุงประสิทธิภาพการให้คำปรึกษาเท่านั้น
            </p>
          </div>
        </div>
      </div>

      {/* Sections & Questions */}
      <div
        className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${isAlreadyAssessed ? "opacity-50 pointer-events-none grayscale" : ""
          }`}
      >
        {sections.map((section, sIndex) => {
          const sectionQuestions = questions
            .filter((q) => {
              // Match exact section (e.g. "1" === "1") OR decimal child (e.g. "1.1" starts with "1.")
              if (q.section === section.section) return true;
              return q.section.startsWith(`${section.section}.`);
            })
            .sort((a, b) => {
              // Natural sort for "1.1", "1.2", "1.10"
              return a.section.localeCompare(b.section, undefined, { numeric: true });
            });
          const hasQuestions = sectionQuestions.length > 0;

          if (!hasQuestions) {
            return (
              <div
                key={section.id}
                className="bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100 shadow-sm mb-6 mt-10 group"
              >
                <div className="flex items-start gap-5">
                  <div className="p-4 bg-white rounded-2xl text-indigo-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-indigo-900 mb-2 tracking-tight">
                      {section.head_description}
                    </h2>
                    {section.description && (
                      <p className="text-indigo-700/70 text-lg leading-relaxed font-semibold">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={section.id}
              className="mb-8 last:mb-0 border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              {/* Section Header */}
              <div className="bg-gradient-to-r from-[#7ca3d5] to-[#5b8bc0] px-6 py-4 md:px-8 border-b border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-lg text-white mt-1">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white drop-shadow-sm">
                      {section.head_description}
                    </h2>
                    {section.description && (
                      <p className="mt-1 text-blue-50 text-sm font-medium leading-relaxed opacity-90">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white divide-y divide-gray-50">
                {sectionQuestions.map((q, qIndex) => {
                  if (q.type === "head") {
                    return (
                      <div
                        key={q.id}
                        className="py-6 px-6 md:px-8 bg-blue-50/30 border-t border-b border-blue-100/50"
                      >
                        <h3 className="text-[#3b5b8d] font-bold text-lg flex items-center gap-3">
                          <span className="flex h-2 w-2 rounded-full bg-[#7ca3d5]"></span>
                          {q.question_text}
                        </h3>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={q.id}
                      className="py-5 px-6 md:px-8 hover:bg-gray-50/80 transition-colors duration-200 group/item"
                    >
                      <div
                        className={`flex flex-col ${q.type === "scale"
                          ? "xl:flex-row gap-6 xl:gap-12"
                          : "gap-4"
                          }`}
                      >
                        <div
                          className={`${q.type === "scale" ? "xl:w-5/12" : "w-full"
                            } flex gap-4`}
                        >
                          <p className="text-gray-800 font-semibold text-base md:text-lg leading-relaxed group-hover/item:text-black transition-colors">
                            {q.question_text}
                          </p>
                        </div>

                        <div
                          className={`${q.type === "scale"
                            ? "xl:w-7/12 flex items-center justify-start xl:justify-center"
                            : "w-full md:pl-10"
                            }`}
                        >
                          {q.type === "scale" && (
                            <div className="w-full">
                              <div className="flex items-center justify-between gap-2 max-w-xl mx-auto">
                                <div className="flex-1 flex flex-wrap items-center justify-center gap-2 md:gap-3 bg-gray-50/30 p-3 rounded-2xl border border-gray-100/50">
                                  {(() => {
                                    const start = q.start_score || 1;
                                    const end = q.end_score || 5;
                                    const step = start <= end ? 1 : -1;
                                    const length = Math.abs(end - start) + 1;
                                    return Array.from({ length }, (_, i) => start + i * step);
                                  })().map((score) => {
                                    const isSelected = Number(answers[q.id]) === score;
                                    return (
                                      <label
                                        key={score}
                                        className="cursor-pointer relative group flex-shrink-0"
                                      >
                                        <input
                                          type="radio"
                                          name={`q-${q.id}`}
                                          value={score}
                                          checked={isSelected}
                                          onChange={() =>
                                            handleAnswerChange(q.id, score)
                                          }
                                          className="peer sr-only"
                                        />
                                        <div
                                          className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center font-bold text-base md:text-lg shadow-sm border transition-all duration-300 transform peer-checked:scale-110
                                      ${isSelected
                                              ? "bg-gradient-to-br from-[#7ca3d5] to-[#5b8bc0] text-white border-transparent shadow-[#7ca3d5]/30 shadow-lg"
                                              : "bg-white text-gray-400 border-gray-200 hover:border-[#7ca3d5] hover:text-[#7ca3d5]"
                                            }`}
                                        >
                                          {score}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {q.type === "text" && (
                            <div className="w-full relative group/input">
                              <div className="absolute inset-0 bg-gradient-to-r from-[#7ca3d5] to-[#5b8bc0] rounded-xl blur opacity-0 group-hover/input:opacity-20 transition-opacity duration-500"></div>
                              <textarea
                                rows={3}
                                placeholder="แสดงความคิดเห็นเพิ่มเติมของคุณอย่างสร้างสรรค์..."
                                value={answers[q.id] || ""}
                                onChange={(e) =>
                                  handleAnswerChange(q.id, e.target.value)
                                }
                                className="relative w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-0 focus:border-[#7ca3d5] outline-none resize-none transition-all placeholder:text-gray-400 shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="sticky bottom-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xl flex items-center justify-between z-10 max-w-5xl mx-auto m-4">
          <div className="text-sm font-medium text-gray-500">
            ความคืบหน้า:{" "}
            <span className="text-[#C1322E] font-bold">
              {Object.keys(answers).length}
            </span>{" "}
            / {questions.filter((q) => q.type === "scale").length} ข้อ
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || isAlreadyAssessed}
            className="px-8 py-2.5 bg-black text-white rounded-lg font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save size={18} />
                ยืนยันการประเมิน
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}