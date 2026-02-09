import React from "react";
import { getSessionToken } from "@/app/component/action";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Users,
  CheckCircle2,
  BarChart3,
  PieChart,
  ArrowLeft,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Building2,
  Star,
  MessageSquare,
  AlignLeft,
  Layout,
  ArrowUpRight,
} from "lucide-react";
import AssessmentCharts from "./components/AssessmentCharts";
import RoundSelector from "./components/RoundSelector";

// Define explicit types for our data structures
interface Room {
  id: number;
  room_code: string;
  room_name: string;
  building?: string;
}

export default async function AssessmentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ round_id?: string; room_id?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionToken();

  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseClient(session);

  // ---------------------------------------------------------
  // 1. Get Teacher Info & Rooms & Students via Direct Queries (Fixed)
  // ---------------------------------------------------------

  // A. Teacher ID
  const { data: teacherDbId, error: idError } = await supabase.rpc("get_my_db_id");
  if (idError || !teacherDbId) {
    console.error("Error fetching ID:", idError);
    redirect("/login");
  }

  // B. Teacher Profile
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", teacherDbId)
    .single();

  if (teacherError || !teacher) {
    console.error("Error fetching profile:", teacherError);
    redirect("/dashboard-teacher");
  }

  // C. Rooms (Joined with Majors)
  const { data: relData, error: relError } = await supabase
    .from("teacher_relationship")
    .select(`
      rooms (
        id,
        room_code,
        majors ( major_name )
      )
    `)
    .eq("teacher_id", teacherDbId);

  const rawRooms = relData?.map((r: any) => r.rooms).filter(Boolean) || [];

  // D. Students (filtered by these rooms)
  const roomIds = rawRooms.map((r: any) => r.id);
  let allStudents: any[] = [];

  if (roomIds.length > 0) {
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, student_name, room_id")
      .in("room_id", roomIds);
    allStudents = studentsData || [];
  }

  // Transform Data for UI
  // UI expects: [{ room_id: { id, room_code, major_name } }, ...]
  const teacherRooms = rawRooms.map((room: any) => ({
    room_id: {
      id: room.id,
      room_code: room.room_code,
      major_name: room.majors?.major_name || ""
    }
  }));

  // Note: allStudents is already flat, but needs to be in loop with room_id for processing if needed
  // Current structure maps correctly: { id, student_id, student_name, room_id }

  // ---------------------------------------------------------
  // 2. Fetch All Rounds (Distinct by around_id)
  // ---------------------------------------------------------
  const { data: rawRoundsData } = await supabase
    .from("assessment_detail")
    .select("around_id, start_date, end_date, min_score, max_score")
    .order("around_id", { ascending: false });

  // Map to unique rounds with dates
  const roundsMap = new Map();
  rawRoundsData?.forEach((r) => {
    if (!roundsMap.has(r.around_id)) {
      roundsMap.set(r.around_id, {
        around_id: r.around_id,
        start_date: r.start_date,
        end_date: r.end_date,
        start_score: r.min_score,
        end_score: r.max_score,
      });
    }
  });

  const allRounds = Array.from(roundsMap.values());
  const now = new Date();

  // Filter Active Rounds
  const activeRounds = allRounds.filter(r => {
    if (!r.start_date || !r.end_date) return true;
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    return start <= now && end >= now;
  });

  const displayRounds = activeRounds.length > 0 ? activeRounds : allRounds.slice(0, 1);

  // Determine Current Round ID
  const round_id_param = params.round_id ? parseInt(params.round_id) : null;
  const currentRoundObj = round_id_param
    ? displayRounds.find(r => r.around_id === round_id_param) || displayRounds[0]
    : displayRounds[0];

  const currentRound = currentRoundObj?.around_id;
  const maxScore = Number(currentRoundObj?.end_score) || 5;
  const minScore = Number(currentRoundObj?.start_score) || 1;

  // ---------------------------------------------------------
  // 3. Fetch Questions (Heads & Details) for Current Round
  // ---------------------------------------------------------

  // Fetch Heads (Sections/Topics)
  const { data: headData } = await supabase
    .from("assessment_head")
    .select("*")
    .eq("around_id", currentRound)
    .order("section1", { ascending: true });

  // Fetch Details (Questions)
  const { data: detailData } = await supabase
    .from("assessment_detail")
    .select("*")
    .eq("around_id", currentRound)
    .order("section1", { ascending: true })
    .order("section2", { ascending: true });

  // Map to Unified Question Structure for UI
  const allQuestions: any[] = [];

  // 1. Process HEADS
  detailData?.filter(d => d.type === 'head').forEach(d => {
    allQuestions.push({
      id: d.id,
      question_text: d.detail,
      section: `${d.section1}.${d.section2}`,
      type: 'head'
    });
  });

  // 2. Process ITEMS
  detailData?.filter(d => d.type !== 'head').forEach(d => {
    allQuestions.push({
      id: d.id,
      question_text: d.detail,
      section: `${d.section1}.${d.section2}`,
      type: d.type === 'score' ? 'scale' : d.type
    });
  });

  const aspects = allQuestions.filter(q => q.type === 'head');
  const scaleQuestions = allQuestions.filter(q => q.type === 'scale');
  const textQuestions = allQuestions.filter(q => q.type === 'text');

  // Map Scale Questions to Aspects
  const aspectMap = new Map<string, { id: number; text: string; questions: number[] }>();

  aspects.forEach(a => {
    aspectMap.set(a.section, { id: a.id, text: a.question_text, questions: [] });
  });

  scaleQuestions.forEach(q => {
    const match = aspects.find(a => q.section.startsWith(a.section + "."));
    if (match) {
      const entry = aspectMap.get(match.section);
      if (entry) entry.questions.push(q.id);
    }
  });

  // ---------------------------------------------------------
  // 4. Fetch Answers (Only for this round)
  // ---------------------------------------------------------
  // Note: We still fetch answers separately to filter by 'currentRound' efficiently on the DB side.
  // Although RPC returns all answers, filtering a huge array in JS might be slower than a specific query.
  const { data: rawAnswers } = await supabase
    .from("assessment_answer")
    .select("student_id, question_id, score_value, text_value")
    .eq("around_id", currentRound)
    .eq("teacher_id", teacher.id); // Ensure we only get answers for this teacher

  // --- FILTERING LOGIC ---
  const excludedSectionPrefixes = new Set<string>();
  aspects.forEach(aspect => {
    const hasTextChild = textQuestions.some(t => t.section.startsWith(aspect.section + '.'));
    if (hasTextChild) {
      excludedSectionPrefixes.add(aspect.section);
    }
  });

  const validScaleQuestions = scaleQuestions.filter(q => {
    const parentAspect = aspects.find(a => q.section.startsWith(a.section + '.'));
    if (parentAspect && excludedSectionPrefixes.has(parentAspect.section)) {
      return false;
    }
    return true;
  });

  const validQuestionIds = new Set(validScaleQuestions.map(q => q.id));
  const allAnswers = rawAnswers?.filter(a => validQuestionIds.has(a.question_id)) || [];

  const validAspectMap = new Map<string, { id: number; text: string; questions: number[] }>();
  aspects.forEach(a => {
    if (!excludedSectionPrefixes.has(a.section)) {
      validAspectMap.set(a.section, { id: a.id, text: a.question_text, questions: [] });
    }
  });

  validScaleQuestions.forEach(q => {
    const match = aspects.find(a => q.section.startsWith(a.section + '.'));
    if (match && validAspectMap.has(match.section)) {
      validAspectMap.get(match.section)!.questions.push(q.id);
    }
  });

  // ---------------------------------------------------------
  // DATA PROCESSING (Stats Calculation)
  // ---------------------------------------------------------

  // A. Participation Stats
  const studentMap = new Map(allStudents.map((s: any) => [s.id, s.room_id]));
  const answeredStudents = new Set(rawAnswers?.map(a => a.student_id)); // Use raw to count any participation

  const totalStudents = allStudents.length;
  const totalCompleted = answeredStudents.size;
  const overallPercentage = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;

  // B. Room Breakdown
  const roomStats = teacherRooms.map((rel: any) => {
    const roomId = rel.room_id.id;
    // Filter students belonging to this room from our flattened list
    const roomStudents = allStudents.filter((s: any) => s.room_id === roomId);
    const roomTotal = roomStudents.length;
    const roomCompleted = roomStudents.filter((s: any) => answeredStudents.has(s.id)).length;
    const roomPct = roomTotal > 0 ? Math.round((roomCompleted / roomTotal) * 100) : 0;

    let rSum = 0;
    let rCount = 0;
    allAnswers?.forEach(a => {
      const sRoom = studentMap.get(a.student_id);
      if (sRoom === roomId && a.score_value !== null) {
        rSum += Number(a.score_value);
        rCount++;
      }
    });
    const avg = rCount > 0 ? (rSum / rCount).toFixed(2) : "0.00";

    return {
      ...rel.room_id,
      total: roomTotal,
      completed: roomCompleted,
      percentage: roomPct,
      average: avg
    };
  });

  // C. Aspect Scores
  const aspectScores = Array.from(validAspectMap.values())
    .map(aspect => {
      let sum = 0;
      let count = 0;
      aspect.questions.forEach(qId => {
        const answers = allAnswers?.filter(a => a.question_id === qId && a.score_value !== null);
        answers?.forEach(a => {
          sum += Number(a.score_value);
          count++;
        });
      });
      const average = count > 0 ? (sum / count).toFixed(2) : "0.00";
      return {
        id: aspect.id,
        text: aspect.text,
        average
      };
    });

  // D. Question Scores
  const questionScores = validScaleQuestions.map(q => {
    const answers = allAnswers?.filter(a => a.question_id === q.id && a.score_value !== null);
    const sum = answers?.reduce((acc, curr) => acc + (Number(curr.score_value) || 0), 0) || 0;
    const count = answers?.length || 0;
    const average = count > 0 ? (sum / count).toFixed(2) : "0.00";
    return {
      text: q.question_text,
      average
    };
  });

  // E. Global Average & Distribution
  let globalSum = 0;
  let globalCount = 0;
  allAnswers?.forEach(a => {
    if (a.score_value !== null) {
      globalSum += Number(a.score_value);
      globalCount++;
    }
  });
  const globalAverage = globalCount > 0 ? (globalSum / globalCount).toFixed(2) : "0.00";

  const scoreCounts: Record<number, number> = {};
  allAnswers?.forEach(a => {
    if (a.score_value !== null) {
      const s = Number(a.score_value);
      scoreCounts[s] = (scoreCounts[s] || 0) + 1;
    }
  });

  const roomAverages = roomStats.map((room: any) => ({
    room_code: room.room_code,
    average: room.average
  }));

  // --- SELECTED ROOM LOGIC ---
  const selectedRoomId = params.room_id ? parseInt(params.room_id) : null;
  let selectedRoomStats = null;
  let selectedRoomComments: { question: string; answers: string[] }[] = [];

  if (selectedRoomId) {
    const roomAnswers = allAnswers?.filter(a => studentMap.get(a.student_id) === selectedRoomId);
    const roomSum = roomAnswers?.reduce((acc, curr) => acc + (Number(curr.score_value) || 0), 0) || 0;
    const roomCount = roomAnswers?.length || 0;
    const roomAvg = roomCount > 0 ? (roomSum / roomCount).toFixed(2) : "0.00";

    const roomAspects = Array.from(validAspectMap.values()).map(aspect => {
      let rSum = 0;
      let rCount = 0;
      aspect.questions.forEach(qId => {
        const answers = roomAnswers?.filter(a => a.question_id === qId);
        answers?.forEach(a => { rSum += Number(a.score_value); rCount++; });
      });
      return {
        id: aspect.id,
        text: aspect.text,
        average: rCount > 0 ? (rSum / rCount).toFixed(2) : "0.00"
      };
    });

    const roomQuestions = validScaleQuestions.map(q => {
      const answers = roomAnswers?.filter(a => a.question_id === q.id);
      const qSum = answers?.reduce((acc, curr) => acc + (Number(curr.score_value) || 0), 0) || 0;
      const qCount = answers?.length || 0;
      return {
        id: q.id,
        text: q.question_text,
        average: qCount > 0 ? (qSum / qCount).toFixed(2) : "0.00"
      }
    });

    const groupedQuestions = roomAspects.map(aspect => {
      const questionIds = Array.from(validAspectMap.values()).find(a => a.id === aspect.id)?.questions || [];
      return {
        ...aspect,
        questionsByRoom: roomQuestions.filter(q => questionIds.includes(q.id))
      };
    });

    selectedRoomStats = {
      average: roomAvg,
      totalScore: roomSum,
      aspects: groupedQuestions
    };

    // Room Comments
    const roomRawAnswers = rawAnswers?.filter(a => studentMap.get(a.student_id) === selectedRoomId);
    textQuestions.forEach(q => {
      const answers = roomRawAnswers?.filter(a => a.question_id === q.id && a.text_value).map(a => a.text_value!);
      if (answers && answers.length > 0) {
        selectedRoomComments.push({
          question: q.question_text,
          answers: answers
        });
      }
    });
  }

  // --- GLOBAL TEXT ANSWERS ---
  const globalTextAnswers: { question: string; answers: string[] }[] = [];
  if (!selectedRoomId) {
    textQuestions.forEach(q => {
      const answers = rawAnswers
        ?.filter(a => a.question_id === q.id && a.text_value)
        .map(a => a.text_value!);

      if (answers && answers.length > 0) {
        globalTextAnswers.push({
          question: q.question_text,
          answers: answers
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] font-sans pb-20">
      {/* 1. Header & Navigation */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-30 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard-teacher"
                className="p-2.5 hover:bg-slate-100/80 rounded-2xl transition-all text-slate-500 hover:text-slate-800 active:scale-95"
              >
                <ArrowLeft size={22} />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                  <span className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                    <PieChart size={20} className="w-5 h-5" />
                  </span>
                  ผลการประเมินการสอน
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 pl-1">แดชบอร์ดสรุปผลการประเมินการสอน</p>
              </div>
            </div>

            <RoundSelector
              rounds={displayRounds}
              currentRound={String(currentRound)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 sm:space-y-14">

        {/* 2. Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Progress (Large) */}
          <div className="lg:col-span-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-[32px] p-6 sm:p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden flex flex-col justify-between min-h-[260px] sm:min-h-[300px] border border-white/10 group">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-700"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] sm:text-xs opacity-90 text-shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  วิเคราะห์จำนวนผู้ร่วมประเมิน
                </p>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight flex items-center gap-3 text-white">
                  กราฟความคืบหน้า
                  <span className="group/tooltip relative">
                    <AlertCircle size={20} className="text-white/50 cursor-help hover:text-white transition-colors" />
                    <span className="absolute left-0 bottom-full mb-3 w-48 p-3 bg-slate-900/90 backdrop-blur-md text-white/90 text-xs font-medium rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-50 text-left shadow-xl translate-y-2 group-hover/tooltip:translate-y-0 invisible group-hover/tooltip:visible border border-white/10 font-sans">
                      แสดงจำนวนนักศึกษาที่เข้าทำแบบประเมินเทียบกับจำนวนทั้งหมด
                    </span>
                  </span>
                </h2>
              </div>
              <div className="bg-white/10 p-3 sm:p-4 rounded-3xl backdrop-blur-md border border-white/20 shadow-lg">
                <Users size={28} className="text-white" />
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl sm:text-8xl font-black tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-100">{overallPercentage}%</span>
                <span className="text-base sm:text-xl text-blue-100 font-bold opacity-80 uppercase tracking-widest">ประเมินแล้ว</span>
              </div>
              <div className="w-full bg-black/20 h-4 rounded-full p-1 border border-white/5 backdrop-blur-sm shadow-inner overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.6)] transition-all duration-1000 ease-out relative"
                  style={{ width: `${overallPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 size={18} className="text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-100 font-bold uppercase opacity-60">ส่งแล้ว</p>
                    <p className="text-lg font-black">{totalCompleted.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                    <Users size={18} className="text-blue-100" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-100 font-bold uppercase opacity-60">จำนวนทั้งหมด</p>
                    <p className="text-lg font-black">{totalStudents.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Background */}
            <div className="absolute -bottom-10 -right-10 opacity-[0.07] pointer-events-none rotate-12">
              <PieChart size={300} />
            </div>
          </div>

          {/* Global Average (Small) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[32px] p-8 sm:p-10 shadow-xl shadow-orange-100/50 border border-orange-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-orange-200 transition-all duration-500">
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-200/20 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-300/30" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -ml-10 -mb-10" />

            <div className="relative z-10 space-y-5">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[28px] flex items-center justify-center text-white mb-2 mx-auto rotate-6 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-xl shadow-orange-200">
                <Star size={40} fill="currentColor" strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-6xl sm:text-7xl font-black text-slate-800 tracking-tighter">{globalAverage}</h3>
                <p className="text-orange-900/40 font-black uppercase text-xs tracking-widest mt-1">คะแนนเฉลี่ยรวม</p>
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-100 border border-orange-100/50">
                เกณฑ์คะแนน {minScore} — {maxScore}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Charts */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"><BarChart3 size={24} /></div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">วิเคราะห์ผลการประเมิน</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">การแสดงผลข้อมูลทางสถิติ</p>
              </div>
            </div>
          </div>

          <AssessmentCharts
            maxScore={maxScore}
            minScore={minScore}
            roomStats={roomAverages}
            questionStats={questionScores}
            aspectStats={aspectScores}
            scoreDistribution={scoreCounts}
          />
        </section>

        {/* 4. Classroom Status Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-md border border-blue-50"><Building2 size={24} /></div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">สถานะรายห้องเรียน</h3>
            </div>
            <span className="hidden sm:inline-block px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
              รวม {roomStats.length} ห้องเรียน
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roomStats.map((room: any) => (
              <Link
                key={room.id}
                href={`?round_id=${currentRound}&room_id=${room.id}`}
                scroll={false}
                className={`group relative overflow-hidden p-6 sm:p-8 rounded-[32px] border transition-all duration-500 flex flex-col justify-between min-h-[200px]
                  ${selectedRoomId === room.id
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-2xl shadow-blue-500/30 scale-[1.03] z-10 ring-4 ring-blue-100/50'
                    : 'bg-white text-slate-800 border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1'
                  }
                `}
              >
                <div className={`absolute -right-6 -bottom-6 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 ${selectedRoomId === room.id ? 'text-white opacity-20' : 'text-slate-900 opacity-[0.03]'}`}>
                  <Building2 size={140} />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedRoomId === room.id ? 'text-blue-200' : 'text-slate-400'}`}>ห้องเรียน</div>
                      <h4 className="text-3xl font-black tracking-tight">{room.room_code}</h4>
                    </div>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-colors duration-300 ${selectedRoomId === room.id
                      ? 'bg-white/20 text-white backdrop-blur-md border border-white/20'
                      : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                      }`}>
                      <ArrowUpRight size={18} className={`transition-transform duration-500 ${selectedRoomId === room.id ? 'rotate-45' : 'group-hover:rotate-45'}`} />
                    </div>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-end justify-between mb-3">
                    <span className={`text-5xl font-black tracking-tighter leading-none ${selectedRoomId === room.id ? 'text-white' : 'text-slate-800'}`}>
                      {room.percentage}<span className="text-lg align-top opacity-60 ml-0.5">%</span>
                    </span>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold uppercase tracking-widest block ${selectedRoomId === room.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        คะแนนเฉลี่ย
                      </span>
                      <span className={`text-sm font-bold ${selectedRoomId === room.id ? 'text-white' : 'text-slate-600'}`}>
                        {room.average}
                      </span>
                    </div>
                  </div>

                  <div className={`w-full h-2 rounded-full overflow-hidden p-[2px] ${selectedRoomId === room.id ? 'bg-black/20' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 shadow-sm relative ${selectedRoomId === room.id
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-300 shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                        : room.percentage >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : room.percentage >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-orange-400'
                        }`}
                      style={{ width: `${room.percentage}%` }}
                    >
                      {selectedRoomId === room.id && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. Focused Room Detail */}
        {selectedRoomId && selectedRoomStats && (
          <section id="room-detail" className="scroll-mt-24 animate-fade-in-up">
            <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-100/50 border border-blue-50 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-50 via-white to-white rounded-full -mr-32 -mt-32 pointer-events-none opacity-60" />

              <div className="p-8 sm:p-12 relative z-10 border-b border-blue-50">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 mb-6">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest">รายงานผลรายห้อง</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight mb-2">
                      รายงานผลห้อง <span className="text-blue-600 border-b-4 border-blue-100 inline-block px-1">{roomStats.find((r: any) => r.id === selectedRoomId)?.room_code}</span>
                    </h2>
                    <p className="text-slate-400 font-medium">
                      แสดงรายละเอียดคะแนนรายข้อและข้อเสนอแนะเฉพาะสำหรับห้องเรียนที่เลือก
                    </p>
                  </div>

                  <Link
                    href={`?round_id=${currentRound}`}
                    className="px-6 py-3 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-bold hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 text-sm"
                  >
                    <Layout size={18} />
                    <span>ปิดหน้านี้</span>
                  </Link>
                </div>
              </div>

              {/* KPI Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-blue-50 flex items-center gap-6 group hover:bg-blue-50/30 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <AlignLeft size={32} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">คะแนนเฉลี่ยในห้อง</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-5xl font-black text-slate-800 tracking-tighter">{selectedRoomStats.average}</h3>
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg border border-blue-100">คะแนนเฉลี่ย</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const currentRoom = roomStats.find((r: any) => r.id === selectedRoomId);
                  return (
                    <div className="p-8 sm:p-10 flex items-center gap-6 group hover:bg-emerald-50/30 transition-colors">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Users size={32} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">อัตราการร่วมประเมิน</p>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-5xl font-black text-slate-800 tracking-tighter">{currentRoom?.percentage || 0}%</h3>
                          <span className="text-sm font-bold text-slate-400">
                            ({currentRoom?.completed}/{currentRoom?.total})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Table Section */}
              <div className="bg-slate-50/50 p-6 sm:p-10">
                <div className="bg-white rounded-[24px] border border-blue-100/60 shadow-lg shadow-blue-50 overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-white border-b border-blue-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">หัวข้อการประเมิน</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">คะแนนเฉลี่ย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedRoomStats.aspects.map((aspect) => (
                          <React.Fragment key={aspect.id}>
                            <tr className="bg-slate-50/80 border-y border-slate-100">
                              <td colSpan={2} className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                  <h5 className="font-black text-slate-800 tracking-tight">{aspect.text}</h5>
                                  <div className="ml-auto flex items-center gap-3">
                                    <div className="flex items-baseline gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">เฉลี่ย</span>
                                      <span className="text-sm font-black">{aspect.average}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {aspect.questionsByRoom.map((q) => (
                              <tr key={q.id} className="hover:bg-blue-50/40 transition-colors group">
                                <td className="px-8 py-5">
                                  <div className="flex gap-4 sm:pl-11">
                                    <p className="text-sm font-bold text-slate-600 group-hover:text-blue-700 transition-colors leading-relaxed">{q.text}</p>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <span className="inline-block font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl text-sm min-w-[3rem] group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    {q.average}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">สิ้นสุดรายงานการประเมินรายห้อง</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. Comments */}
        {!selectedRoomId && globalTextAnswers.length > 0 && (
          <section className="animate-fade-in-up space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><MessageSquare size={24} /></div>
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
      </main>
    </div>
  );
}
