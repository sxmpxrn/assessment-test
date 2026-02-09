"use client";

import { useState, useEffect, use } from "react";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionToken } from "@/app/component/action"
import {
    Calendar,
    Clock,
    FileText,
    Layout,
    Loader2,
    Save,
    Type,
    Plus,
    Trash2,
    CheckCircle2,
    AlignLeft,
    GripVertical,
    List,
    ArrowLeft,
    RefreshCcw, // Icon for Recreate
    AlertCircle,
    X,
    BookOpen,
    Lightbulb
} from "lucide-react";

type QuestionType = "scale" | "text" | "head";
type SectionType = "questions" | "description";

interface Question {
    id: string;
    text: string;
    type: QuestionType;
    section: string; // Link to section ID (UUID)
    parentId?: string; // Link to Head Question ID
    dbId?: number; // Real DB ID for syncing
}

interface Section {
    id: string;
    dbId?: number; // Real DB ID for syncing
    type: SectionType;
    title: string;
    description: string;
}

export default function AssessmentEdit({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const around_id = id;
    // const token = await getSessionToken(); // Moved to inside functions
    // const supabase = getSupabaseClient(token); // Moved to inside functions
    const router = useRouter();

    const [loading, setLoading] = useState(true); // Start true for fetching
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showManual, setShowManual] = useState(false);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState(false); // Trigger effect when true

    // Form State
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
                            dbId: h.id, // Capture real ID
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
                    // Global settings from first record
                    if (first.start_date) setStartDate(first.start_date.split("T")[0]);
                    if (first.end_date) setEndDate(first.end_date.split("T")[0]);

                    const scoreRow = dData.find((d: any) => d.type === 'score' || d.type === 'scale');
                    if (scoreRow) {
                        if (scoreRow.min_score !== null) setMinScore(scoreRow.min_score);
                        if (scoreRow.max_score !== null) setMaxScore(scoreRow.max_score);
                    }

                    const mappedQuestions: Question[] = [];
                    const headMap: Record<string, string> = {}; // key: "section1-topicNum"

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
                                    dbId: d.id, // Capture real ID
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

                                // Strategy A: Explicit X.Y
                                if (s2Str.includes('.')) {
                                    const parts = s2Str.split('.');
                                    const parentTopicNum = parts[0];
                                    const parentKey = `${d.section1}-${parentTopicNum}`;
                                    parentId = headMap[parentKey];
                                }

                                // Strategy B: Sequential Fallback
                                if (!parentId) {
                                    parentId = lastHeadId;
                                }

                                if (parentId) {
                                    mappedQuestions.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        dbId: d.id, // Capture real ID
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


    const addSection = (type: SectionType, index?: number) => {
        const newSectionId = Math.random().toString(36).substr(2, 9);
        const newSection: Section = {
            id: newSectionId,
            type: type,
            title: "",
            description: "",
        };

        if (typeof index === "number") {
            const newSections = [...sections];
            newSections.splice(index, 0, newSection);
            setSections(newSections);
        } else {
            setSections([...sections, newSection]);
        }
    };

    const removeSection = (id: string) => {
        if (sections.length === 1) {
            alert("ต้องมีอย่างน้อย 1 ส่วน");
            return;
        }
        if (!confirm("การลบส่วนนี้จะลบคำถามทั้งหมดในส่วนนี้ด้วย คุณแน่ใจหรือไม่?")) {
            return;
        }
        setSections(sections.filter((s) => s.id !== id));
        setQuestions(questions.filter((q) => q.section !== id));
    };

    const updateSection = (id: string, updates: Partial<Section>) => {
        setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const addQuestion = (sectionId: string, type: QuestionType = "scale", parentId?: string) => {
        setQuestions([
            ...questions,
            {
                id: Math.random().toString(36).substr(2, 9),
                text: "",
                type: type,
                section: sectionId,
                parentId: parentId,
            },
        ]);
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(
            questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
        );
    };

    const handleRecreate = () => {
        router.push(`/admin/assessment-create?recreate_from=${around_id}`);
    };

    const [clearAnswersDecision, setClearAnswersDecision] = useState<boolean | null>(null);

    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmit = (clearAnswers: boolean) => {
        setClearAnswersDecision(clearAnswers);
        setShowConfirmModal(false);
        // We need to trigger the actual submit process now
        // But since executeSubmit is async and uses state, we can just call it directly
        executeSubmit(clearAnswers);
    };

    const executeSubmit = async (clearAnswers: boolean) => {
        setSaving(true);
        setSuccess(false);
        let warningMsg = "";

        try {
            const aroundIdInt = parseInt(around_id);

            const token = await getSessionToken();
            const supabase = getSupabaseClient(token);

            if (isNaN(aroundIdInt)) {
                throw new Error("Invalid assessment ID (around_id must be a number)");
            }

            console.log("Starting assessment update for ID:", aroundIdInt);

            // Step 0.5: Delete Answers if requested
            if (clearAnswers) {
                console.log("Deleting all answers for round:", aroundIdInt);
                const { error: delAnswerError } = await supabase
                    .from("assessment_answer")
                    .delete()
                    .eq("around_id", aroundIdInt);

                if (delAnswerError) {
                    console.error("Error deleting answers:", delAnswerError);
                    throw new Error("ไม่สามารถลบคำตอบเดิมได้: " + delAnswerError.message);
                }
            }

            // 1. Delete Existing Data (Delete All Strategy)
            // Note: This only works if answers are cleared or don't exist

            // A. Delete Details First (Children of Heads, Referenced by Answers)
            const { error: delDetailError } = await supabase
                .from("assessment_detail")
                .delete()
                .eq("around_id", aroundIdInt);

            if (delDetailError) {
                console.error("Error deleting details:", delDetailError);
                if (delDetailError.code === '23503') {
                    throw new Error("ไม่สามารถบันทึกโครงสร้างใหม่ได้เนื่องจากมีข้อมูลคำตอบค้างอยู่\nกรุณาเลือกตัวเลือก 'ล้างข้อมูลคำตอบทั้งหมด' เพื่อทำการบันทึก");
                }
                throw delDetailError;
            }

            // B. Delete Heads Second
            const { error: delHeadError } = await supabase
                .from("assessment_head")
                .delete()
                .eq("around_id", aroundIdInt);

            if (delHeadError) {
                console.error("Error deleting heads:", delHeadError);
                if (delHeadError.code === '23503') {
                    throw new Error("ไม่สามารถลบหัวข้อได้เนื่องจากมีข้อมูลใช้งานอยู่ (Foreign Key)");
                }
                throw delHeadError;
            }

            // 2. Insert New Data
            const activeSections = sections;

            // A. Insert Heads
            const headPayloads = activeSections.map((s, index) => ({
                section1: index + 1,
                description: s.description || null,
                head_description: s.title || null,
                around_id: aroundIdInt,
            }));

            const { error: errorH } = await supabase
                .from("assessment_head")
                .insert(headPayloads);

            if (errorH) {
                console.error("Error inserting heads:", errorH);
                throw errorH;
            }

            // B. Insert Details
            const detailPayloads: any[] = [];
            const startTime = startDate ? `${startDate} 00:00:00` : null;
            const endTime = endDate ? `${endDate} 23:59:59` : null;

            activeSections.forEach((s, sIndex) => {
                const sectionNum = sIndex + 1;
                const heads = questions.filter(q => q.section === s.id && q.type === "head");

                heads.forEach((head, hIndex) => {
                    const topicNum = hIndex + 1;

                    // HEAD ROW of Detail
                    detailPayloads.push({
                        section1: sectionNum,
                        section2: topicNum,
                        detail: head.text,
                        type: 'head',
                        around_id: aroundIdInt,
                        start_date: startTime,
                        end_date: endTime,
                        max_score: null,
                        min_score: null,
                    });

                    // CHILDREN ROWS
                    const children = questions.filter(q => q.parentId === head.id);
                    children.forEach((child, cIndex) => {
                        const childNum = cIndex + 1;
                        const section2Value = `${topicNum}.${childNum}`;

                        detailPayloads.push({
                            section1: sectionNum,
                            section2: section2Value,
                            detail: child.text,
                            type: child.type === 'scale' ? 'score' : child.type, // Map 'scale' back to 'score' for DB if needed, or keep 'scale' if DB supports
                            max_score: child.type === 'scale' ? maxScore : null,
                            min_score: child.type === 'scale' ? minScore : null,
                            around_id: aroundIdInt,
                            start_date: startTime,
                            end_date: endTime,
                        });
                    });
                });
            });

            if (detailPayloads.length > 0) {
                const { error: errorD } = await supabase
                    .from("assessment_detail")
                    .insert(detailPayloads);
                if (errorD) {
                    console.error("Error inserting details:", errorD);
                    if (errorD.code === '22P02') {
                        alert(`ข้อผิดพลาด: รูปแบบข้อมูล section2 ไม่รองรับ\nกรุณาตรวจสอบว่า column 'section2' เป็น Numeric/Float`);
                    }
                    throw errorD;
                }
            }


            if (warningMsg) {
                alert(`บันทึกข้อมูลเรียบร้อย (มีข้อควรระวัง)\n\n${warningMsg}\nข้อมูลที่ลบไม่ได้จะยังคงอยู่ในระบบ`);
                // Force reload to sync UI with what actually survived in DB
                // window.location.reload(); 
                // Or just keep success state? Reload is safer to show zombies.
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error: any) {
            console.error("Error updating assessment full context:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                error
            });
            alert("เกิดข้อผิดพลาด: " + (error.message || error.code || "กรุณาลองใหม่อีกครั้ง"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบแบบประเมินรหัส ${around_id}?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            return;
        }

        setLoading(true);
        try {
            const aroundIdInt = parseInt(around_id);
            const token = await getSessionToken();
            const supabase = getSupabaseClient(token);

            // Delete Details First (FK constraint usually, but here logic is same)
            const { error: errD } = await supabase
                .from("assessment_detail")
                .delete()
                .eq("around_id", aroundIdInt);
            if (errD) throw errD;

            // Delete Heads
            const { error: errH } = await supabase
                .from("assessment_head")
                .delete()
                .eq("around_id", aroundIdInt);
            if (errH) throw errH;

            alert("ลบข้อมูลเรียบร้อยแล้ว");
            router.push("/admin");
        } catch (error: any) {
            console.error("Error deleting:", error);
            alert("ไม่สามารถลบข้อมูลได้: " + error.message);
            setLoading(false);
        }
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

                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                type="button"
                                className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                            >
                                <Trash2 size={16} />
                                ลบแบบประเมินนี้
                            </button>
                            <button
                                onClick={handleRecreate}
                                type="button"
                                className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                            >
                                <RefreshCcw size={16} />
                                Recreate (สร้างใหม่จากรอบนี้)
                            </button>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Layout className="text-ksu" size={32} />
                        แก้ไขแบบประเมิน
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        แก้ไขข้อมูลสำหรับปีการศึกษา {academicYear} / {term}
                    </p>
                </div>

                <form onSubmit={handleInitialSubmit} className="space-y-8">
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
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-ksu focus:border-ksu block p-2.5"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" /> วันที่สิ้นสุด
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-ksu focus:border-ksu block p-2.5"
                                    required
                                />
                            </div>
                            {/* Global Score Settings */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">คะแนนเริ่มต้น (สเกล)</label>
                                <input
                                    type="number"
                                    value={minScore}
                                    onChange={(e) => setMinScore(Number(e.target.value))}
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-ksu focus:border-ksu block p-2.5"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">คะแนนสุดท้าย (สเกล)</label>
                                <input
                                    type="number"
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(Number(e.target.value))}
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-ksu focus:border-ksu block p-2.5"
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

                            <div className="flex gap-2">
                                {/* Buttons moved to be inline with sections */}
                            </div>
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
                                                <input
                                                    type="text"
                                                    value={section.title}
                                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                                    placeholder={`ชื่อส่วนที่ ${index + 1} ${section.type === 'description' ? '(เช่น คำชี้แจง)' : '(เช่น ข้อมูลทั่วไป)'}`}
                                                    className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-emerald-500 focus:ring-0 text-lg font-bold text-gray-900 px-0 py-2 placeholder-gray-400 transition-colors"
                                                />

                                                {section.type === 'description' && (
                                                    <textarea
                                                        value={section.description}
                                                        onChange={(e) => updateSection(section.id, { description: e.target.value })}
                                                        placeholder="ระบุข้อความคำอธิบาย หรือรายละเอียดที่ต้องการแจ้ง..."
                                                        rows={5}
                                                        className="w-full bg-white border border-blue-200/50 rounded-lg px-4 py-3 text-base text-gray-700 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 shadow-sm"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSection(section.id)}
                                            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                            title="ลบส่วนนี้"
                                        >
                                            <Trash2 size={20} />
                                        </button>
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
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeQuestion(head.id)}
                                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                        title="ลบหัวข้อ"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={head.text}
                                                                    onChange={(e) => updateQuestion(head.id, { text: e.target.value })}
                                                                    placeholder="ระบุชื่อหัวข้อ..."
                                                                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-ksu focus:border-ksu"
                                                                />
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
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeQuestion(child.id)}
                                                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                                                                <div className="md:col-span-8">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={child.text}
                                                                                        onChange={(e) => updateQuestion(child.id, { text: e.target.value })}
                                                                                        placeholder="ระบุคำถาม..."
                                                                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-ksu focus:border-ksu"
                                                                                    />
                                                                                </div>
                                                                                <div className="md:col-span-4">
                                                                                    <select
                                                                                        value={child.type}
                                                                                        onChange={(e) => updateQuestion(child.id, { type: e.target.value as QuestionType })}
                                                                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-ksu focus:border-ksu"
                                                                                    >
                                                                                        <option value="scale">สเกลวัดระดับ (1-N)</option>
                                                                                        <option value="text">ข้อความ (ปลายเปิด)</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                            {/* Add Child Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => addQuestion(section.id, "scale", head.id)}
                                                                className="ml-8 mt-2 flex items-center gap-2 text-xs font-bold text-ksu hover:text-ksu-dark px-3 py-1.5 rounded-lg border border-dashed border-ksu/20 hover:border-ksu bg-ksu/5 hover:bg-ksu/10 transition-all"
                                                            >
                                                                <Plus size={14} />
                                                                เพิ่มคำถามย่อย (ในหัวข้อที่ {index + 1}.{hIndex + 1})
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                            {/* Add Topic Button (Section Level) */}
                                            <div className="grid grid-cols-1 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => addQuestion(section.id, "head")}
                                                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-white hover:bg-blue-500 px-4 py-3 rounded-lg transition-colors border border-dashed border-blue-300 hover:border-blue-500 justify-center bg-blue-50/30"
                                                >
                                                    <Type size={16} />
                                                    เพิ่มหัวข้อ (Topic) ใหม่
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Visual hint for Description Section */}
                                    {section.type === 'description' && (
                                        <div className="px-6 py-3 bg-blue-50/20 text-center text-sm text-blue-400 italic">
                                            ส่วนนี้สำหรับแสดงข้อความเท่านั้น (ไม่มีคำถาม)
                                        </div>
                                    )}
                                </div>
                                {/* Add Section Buttons (Below Each Section) */}
                                {/* Removed per-section add buttons to prevent UI shifting */}
                            </div>
                        ))}

                        {/* Global Add Section Buttons (Always at the bottom) */}
                        <div className="relative py-6 group">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-200 border-dashed"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <div className="bg-gray-50 px-6 py-2 rounded-full flex items-center gap-4 shadow-sm border border-gray-200">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:inline-block">
                                        เพิ่มส่วนใหม่
                                    </span>
                                    <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => addSection("questions")}
                                            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-sm font-bold border border-emerald-200 hover:border-emerald-600 shadow-sm"
                                        >
                                            <List size={16} />
                                            ส่วนคำถาม
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addSection("description")}
                                            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-sm font-bold border border-blue-200 hover:border-blue-600 shadow-sm"
                                        >
                                            <FileText size={16} />
                                            ส่วนคำอธิบาย
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-4 z-10 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            รวม {sections.length} ส่วน, {questions.length} คำถาม
                        </div>
                        <div className="flex items-center gap-3">
                            {success && (
                                <div className="flex items-center gap-2 text-emerald-600 animate-in fade-in mr-4">
                                    <CheckCircle2 size={20} />
                                    <span className="font-medium text-sm">บันทึกสำเร็จ!</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                รีเซ็ต
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-2.5 text-sm font-bold text-white bg-ksu rounded-xl hover:bg-ksu-dark disabled:opacity-70 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        บันทึกการแก้ไข
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </form >
            </div >

            {/* Floating Action Button (Manual) */}
            <button
                type="button"
                onClick={() => setShowManual(true)}
                className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-500 to-pink-600 text-white p-4 rounded-full shadow-lg shadow-red-200 hover:shadow-red-300 hover:scale-110 transition-all duration-300 group border-4 border-white/20"
                title="คู่มือการใช้งาน"
            >
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-ping opacity-75"></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                <div className="relative z-10 animate-bounce-slow">
                    <BookOpen size={28} strokeWidth={2.5} />
                </div>

                {/* Tooltip */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-sm font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none shadow-xl">
                    คู่มือการใช้งาน
                    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-l-[6px] border-l-gray-900/90 border-y-[6px] border-y-transparent"></div>
                </div>
            </button>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-all" onClick={() => setShowConfirmModal(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 bg-linear-to-r from-red-50 to-white border-b border-red-100 flex items-center gap-4">
                            <div className="bg-red-100 p-3 rounded-full">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">ยืนยันการบันทึกข้อมูล</h3>
                                <p className="text-sm text-red-500 font-medium">กรุณาเลือกรูปแบบการจัดการข้อมูลที่มีอยู่เดิม</p>
                            </div>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600 leading-relaxed">
                                ระบบตรวจพบว่าคุณกำลังพยายามแก้ไขโครงสร้างแบบประเมิน
                                การเปลี่ยนแปลงนี้อาจส่งผลกระทบต่อข้อมูลคำตอบของนักศึกษาที่มีอยู่ในระบบ
                            </p>

                            <div className="space-y-3 pt-2">
                                {/* Option 1: Delete All */}
                                <button
                                    onClick={() => confirmSubmit(true)}
                                    className="w-full group relative flex items-start gap-4 p-4 rounded-xl border-2 border-transparent bg-red-50 hover:bg-white hover:border-red-200 hover:shadow-lg transition-all duration-200 text-left"
                                >
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-red-100 group-hover:border-red-200 group-hover:scale-110 transition-transform">
                                        <Trash2 size={24} className="text-red-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                                            ล้างข้อมูลคำตอบทั้งหมด (แนะนำ)
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ลบคำตอบของนักศึกษาในรอบนี้ทิ้งทั้งหมด เพื่อให้โครงสร้างแบบประเมินใหม่สมบูรณ์ 100% ไม่มีข้อผิดพลาด
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center p-1 bg-white rounded-full border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <CheckCircle2 size={16} className="text-red-500" />
                                    </div>
                                </button>

                                {/* Option 2: Keep Existing */}
                                <button
                                    onClick={() => confirmSubmit(false)}
                                    className="w-full group relative flex items-start gap-4 p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all duration-200 text-left"
                                >
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 group-hover:border-blue-200 group-hover:scale-110 transition-transform">
                                        <Save size={24} className="text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            เก็บข้อมูลเดิมไว้
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            พยายามรักษาคำตอบเดิมไว้ ระบบจะบันทึกเฉพาะส่วนที่ทำได้ (อาจเกิดข้อผิดพลาดหากลบคำถามที่มีคนตอบไปแล้ว)
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
                            หากไม่แน่ใจ กดกากบาทมุมขวาบนเพื่อยกเลิก
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Modal */}
            {showManual && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setShowManual(false)}
                    />
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col animate-in fade-in zoom-in-95 duration-300">

                        {/* Header */}
                        <div className="relative bg-slate-900 text-white p-8 overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-20"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div className="flex gap-6 items-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                                        <BookOpen size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black tracking-tight mb-1">คู่มือการสร้างแบบประเมิน</h3>
                                        <p className="text-blue-200 font-medium text-sm flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            Assessment Creation Guide
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowManual(false)}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white/70 hover:text-white"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content scroller */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Step Cards */}
                                {[
                                    {
                                        step: "01",
                                        title: "กำหนดข้อมูลรอบ",
                                        desc: "ระบุปีการศึกษา ภาคเรียน และช่วงเวลาเริ่มต้น-สิ้นสุด รวมถึงกำหนดช่วงคะแนน (Scale) ที่ต้องการ",
                                        icon: <Calendar className="text-blue-600" size={24} />,
                                        color: "blue"
                                    },
                                    {
                                        step: "02",
                                        title: "โครงสร้างแบบประเมิน",
                                        desc: "แบ่งส่วนของแบบประเมินเป็น 'ส่วนคำถาม' หรือ 'ส่วนคำอธิบาย' ตามความเหมาะสมของเนื้อหา",
                                        icon: <Layout className="text-emerald-600" size={24} />,
                                        color: "emerald"
                                    },
                                    {
                                        step: "03",
                                        title: "สร้างคำถาม",
                                        desc: "สร้าง 'หัวข้อ (Topic)' เพื่อจัดกลุ่ม และเพิ่ม 'คำถามย่อย' ได้ทั้งแบบสเกลและปลายเปิด",
                                        icon: <List className="text-purple-600" size={24} />,
                                        color: "purple"
                                    },
                                    {
                                        step: "04",
                                        title: "ตรวจสอบและบันทึก",
                                        desc: "ตรวจสอบความถูกต้องของข้อมูลทั้งหมด แล้วกดปุ่ม 'บันทึกแบบประเมิน' เพื่อยืนยัน",
                                        icon: <Save className="text-orange-600" size={24} />,
                                        color: "orange"
                                    }

                                ].map((item, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 flex items-center justify-center border border-${item.color}-100 group-hover:scale-110 transition-transform`}>
                                                {item.icon}
                                            </div>
                                            <span className="text-4xl font-black text-slate-100 group-hover:text-slate-200 transition-colors select-none">{item.step}</span>
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}

                            </div>

                            {/* Visual Hint / Pro Tip */}
                            <div className="mt-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg shadow-blue-200">
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="shrink-0 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <Lightbulb size={32} className="text-yellow-300" fill="currentColor" />
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h4 className="text-lg font-bold mb-1">เคล็ดลับ (Pro Tip)</h4>
                                        <p className="text-blue-100 text-sm opacity-90">
                                            คุณสามารถเพิ่ม "ส่วนคำอธิบาย" คั่นกลางระหว่างส่วนคำถามได้ เพื่อให้รายละเอียดเพิ่มเติมกับผู้ประเมินในแต่ละช่วง
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowManual(false)}
                                        className="shrink-0 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all active:scale-95"
                                    >
                                        เริ่มใช้งานทันที
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
