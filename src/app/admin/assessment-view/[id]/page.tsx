"use client";

import { useState, useEffect, use } from "react";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseRoundId, getTermLabel, formatRoundId } from "@/lib/utils/round-formatter";
import { getSessionToken } from "@/app/component/action"
import {
    Calendar,
    Clock,
    Layout,
    Loader2,
    AlignLeft,
    GripVertical,
    ArrowLeft,
    RefreshCcw,
    FileText
} from "lucide-react";

type QuestionType = "scale" | "text" | "head";
type SectionType = "questions" | "description";

interface Question {
    id: string;
    text: string;
    type: QuestionType;
    section: string;
    parentId?: string;
}

interface Section {
    id: string;
    type: SectionType;
    title: string;
    description: string;
}

export default function AssessmentView({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const around_id = id;
    // const token = await getSessionToken();
    // const supabase = getSupabaseClient(token);
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    // Form State (Read-only for view)
    const [academicYear, setAcademicYear] = useState(
        new Date().getFullYear() + 543
    );
    const [term, setTerm] = useState("1");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Global Score Settings
    const [minScore, setMinScore] = useState(1);
    const [maxScore, setMaxScore] = useState(5);

    const [sections, setSections] = useState<Section[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Fetch Data on Load
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (around_id.length >= 5) {
                    const y = around_id.substring(0, 4);
                    const t = around_id.substring(4);
                    setAcademicYear(parseInt(y));
                    setTerm(t);
                }

                // 1. Fetch Heads (Sections)
                const token = await getSessionToken();
                const supabase = getSupabaseClient(token);

                const { data: hData, error: hError } = await supabase
                    .from("assessment_head")
                    .select("*")
                    .eq("around_id", parseInt(around_id))
                    .order("section1", { ascending: true });

                if (hError) throw hError;

                // 2. Fetch Details (Questions)
                const { data: dData, error: dError } = await supabase
                    .from("assessment_detail")
                    .select("*")
                    .eq("around_id", parseInt(around_id))
                    .order("section1", { ascending: true })
                    .order("section2", { ascending: true });

                if (dError) throw dError;

                // Map Sections
                const sectionIdMap: Record<number, string> = {};
                let mappedSections: Section[] = [];

                if (hData && hData.length > 0) {
                    mappedSections = hData.map((h: any) => {
                        const frontendId = Math.random().toString(36).substr(2, 9);
                        sectionIdMap[h.section1] = frontendId;

                        const hasQuestions = dData?.some((d: any) => d.section1 === h.section1);

                        return {
                            id: frontendId,
                            type: hasQuestions ? "questions" : "description",
                            title: h.head_description || "",
                            description: h.description || ""
                        };
                    });
                    setSections(mappedSections);
                }

                // Map Questions
                if (dData && dData.length > 0) {
                    const first = dData[0];
                    if (first.start_date) setStartDate(first.start_date.split("T")[0]);
                    if (first.end_date) setEndDate(first.end_date.split("T")[0]);

                    const scoreRow = dData.find((d: any) => d.type === 'score' || d.type === 'scale');
                    if (scoreRow) {
                        if (scoreRow.min_score !== null) setMinScore(scoreRow.min_score);
                        if (scoreRow.max_score !== null) setMaxScore(scoreRow.max_score);
                    }

                    const mappedQuestions: Question[] = [];
                    const headMap: Record<string, string> = {};

                    // 1. Process Heads
                    dData.forEach((d: any) => {
                        if (d.type === 'head') {
                            const sectionFrontendId = sectionIdMap[d.section1];
                            if (sectionFrontendId) {
                                const newHeadId = Math.random().toString(36).substr(2, 9);
                                const s2Str = String(d.section2).split('.')[0];
                                const key = `${d.section1}-${s2Str}`;
                                headMap[key] = newHeadId;

                                mappedQuestions.push({
                                    id: newHeadId,
                                    text: d.detail || "",
                                    type: 'head',
                                    section: sectionFrontendId,
                                });
                            }
                        }
                    });

                    // 2. Process Children
                    let lastHeadId: string | undefined;
                    dData.forEach((d: any) => {
                        const s2Str = String(d.section2);

                        // Update sequential fallback
                        if (d.type === 'head') {
                            const s2Key = s2Str.split('.')[0];
                            const key = `${d.section1}-${s2Key}`;
                            lastHeadId = headMap[key];
                            return;
                        }

                        if (d.type !== 'head') {
                            const sectionFrontendId = sectionIdMap[d.section1];
                            if (sectionFrontendId) {
                                let parentId: string | undefined;

                                if (s2Str.includes('.')) {
                                    const parts = s2Str.split('.');
                                    const parentTopicNum = parts[0];
                                    const parentKey = `${d.section1}-${parentTopicNum}`;
                                    parentId = headMap[parentKey];
                                }

                                if (!parentId) {
                                    parentId = lastHeadId;
                                }

                                if (parentId) {
                                    mappedQuestions.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        text: d.detail || "",
                                        type: d.type === 'score' ? 'scale' : d.type,
                                        section: sectionFrontendId,
                                        parentId: parentId
                                    });
                                }
                            }
                        }
                    });

                    setQuestions(mappedQuestions);
                }

            } catch (error) {
                console.error("Error fetching assessment:", error);
                alert("ไม่สามารถโหลดข้อมูลได้");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [around_id]);


    const handleRecreate = () => {
        // Redirect to Create page with recreate_from param
        router.push(`/admin/assessment-create?recreate_from=${around_id}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <Loader2 size={40} className="animate-spin mb-4 text-ksu" />
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-800">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <Link href="/admin" className="text-gray-500 hover:text-ksu flex items-center gap-1 text-sm font-medium transition-colors">
                            <ArrowLeft size={16} />
                            กลับไปแดชบอร์ด
                        </Link>

                        <button
                            onClick={handleRecreate}
                            type="button"
                            className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                        >
                            <RefreshCcw size={16} />
                            Recreate (สร้างใหม่จากรอบนี้)
                        </button>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Layout className="text-ksu" size={32} />
                        รายละเอียดแบบประเมิน
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        {formatRoundId(around_id)} (View Only)
                    </p>
                </div>

                <div className="space-y-8">
                    {/* 1. Context Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-gray-400" />
                                ข้อมูลรอบการประเมิน
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">ปีการศึกษา</label>
                                <input
                                    type="number"
                                    value={academicYear}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">ภาคการศึกษา</label>
                                <select
                                    value={term}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
                                >
                                    <option value="1">ภาคเรียนที่ 1</option>
                                    <option value="2">ภาคเรียนที่ 2</option>
                                    <option value="3">ภาคเรียนฤดูร้อน</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" /> วันที่เริ่มต้น
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" /> วันที่สิ้นสุด
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
                                />
                            </div>
                            {/* Global Score Settings */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">คะแนนเริ่มต้น (สเกล)</label>
                                <input
                                    type="number"
                                    value={minScore}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">คะแนนสุดท้าย (สเกล)</label>
                                <input
                                    type="number"
                                    value={maxScore}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block p-2.5 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Sections Container */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <AlignLeft size={24} className="text-ksu" />
                                ส่วนของแบบประเมิน (Sections)
                            </h2>
                        </div>

                        {sections.map((section, index) => (
                            <div key={section.id} className="space-y-4">
                                <div
                                    className={`rounded-2xl shadow-md border overflow-hidden relative ${section.type === "questions"
                                        ? "bg-white border-gray-200"
                                        : "bg-blue-50/30 border-blue-100"
                                        }`}
                                >
                                    {/* Section Header */}
                                    <div className={`${section.type === 'questions' ? 'bg-gray-50' : 'bg-blue-50/50'} border-b border-gray-100 p-5 flex items-start gap-4`}>
                                        <div className={`${section.type === 'questions' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} font-bold rounded-lg w-10 h-10 flex items-center justify-center shrink-0 text-lg`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-emerald-500 focus:ring-0 text-lg font-bold text-gray-900 px-0 py-2 placeholder-gray-400 transition-colors">
                                                    {section.title}
                                                </div>

                                                {section.type === 'description' && (
                                                    <div className="w-full bg-white border border-blue-200/50 rounded-lg px-4 py-3 text-base text-gray-700 shadow-sm whitespace-pre-wrap">
                                                        {section.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Questions in this Section (Only if type is questions) */}
                                    {section.type === 'questions' && (
                                        <div className="p-6 bg-white space-y-4">
                                            {/* Render Topics (Head) & Their Children */}
                                            {questions
                                                .filter(q => q.section === section.id && q.type === "head")
                                                .map((head, hIndex) => (
                                                    <div key={head.id} className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/5 mb-4">
                                                        {/* Topic Header */}
                                                        <div className="p-4 bg-blue-50/30 flex items-start gap-3 border-b border-blue-100">
                                                            <div className="pt-3 text-blue-300">
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                                                        หัวข้อ (Topic) ที่ {index + 1}.{hIndex + 1}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800">
                                                                    {head.text}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Children Questions */}
                                                        <div className="p-4 space-y-3 bg-white">
                                                            {questions
                                                                .filter(q => q.parentId === head.id)
                                                                .map((child, cIndex) => (
                                                                    <div key={child.id} className="flex items-start gap-3 pl-4 border-l-2 border-gray-100 transition-colors hover:border-ksu/50 group">
                                                                        <div className="pt-3 text-gray-300 group-hover:text-ksu/50">
                                                                            <GripVertical size={14} />
                                                                        </div>
                                                                        <div className="flex-1 rounded-lg p-3 bg-gray-50 border border-gray-100 group-hover:border-ksu/30">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <span className="text-xs font-medium text-gray-400">
                                                                                    ข้อที่ {index + 1}.{hIndex + 1}.{cIndex + 1}
                                                                                </span>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                                                                <div className="md:col-span-8">
                                                                                    <div className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-sm">
                                                                                        {child.text}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="md:col-span-4">
                                                                                    <div className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-600 flex items-center gap-2">
                                                                                        <FileText size={14} className="text-gray-400" />
                                                                                        {child.type === 'scale' ? 'สเกลวัดระดับ (1-N)' : 'ข้อความ (ปลายเปิด)'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Visual hint for Description Section */}
                                    {section.type === 'description' && (
                                        <div className="px-6 py-3 bg-blue-50/20 text-center text-sm text-blue-400 italic">
                                            ส่วนนี้สำหรับแสดงข้อความเท่านั้น (ไม่มีคำถาม)
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
