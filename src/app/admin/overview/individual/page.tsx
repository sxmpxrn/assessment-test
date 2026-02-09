"use client";

import React, { useState, useEffect } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LabelList
} from 'recharts';
import {
    FileText,
    Users,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Loader2,
    Calendar,
    ArrowUpRight,
    MessageSquare,
    Target,
    Award,
    ChevronRight,
    Download,
    Building2,
    RefreshCw
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { formatRoundId } from '@/lib/utils/round-formatter';
import { getSessionToken } from '@/app/component/action';

interface AssessmentDomain {
    id: string;
    name: string;
    score: number;
    fullMark: number;
    subject: string;
    A: number;
}

interface AssessmentItem {
    id: number;
    section: string;
    domain: string;
    text: string;
    score: number;
}

interface EntityScore {
    name: string;
    score: number;
}

interface MajorOption {
    id: number;
    name: string;
    faculty_id: number;
}

interface FacultyOption {
    id: number;
    name: string;
}

interface TeacherOption {
    id: number;
    name: string;
    major_id?: number;
}

interface FeedbackComment {
    id: number;
    question: string;
    comment: string;
    section: string;
}

interface GroupedFeedback {
    question_id: number;
    question_text: string;
    section: string;
    comments: string[];
}

interface GroupedFeedback {
    question_id: number;
    question_text: string;
    section: string;
    comments: string[];
}

export default function Overview() {
    const [loading, setLoading] = useState(true);
    const [rounds, setRounds] = useState<number[]>([]);
    const [selectedRound, setSelectedRound] = useState<number | null>(null);

    // Data State
    const [overallScore, setOverallScore] = useState(0);
    const [participatedStudents, setParticipatedStudents] = useState(0);
    const [participatedTeachers, setParticipatedTeachers] = useState(0);
    const [totalStudentsInSystem, setTotalStudentsInSystem] = useState(0);
    const [totalTeachersInSystem, setTotalTeachersInSystem] = useState(0);
    const [domainData, setDomainData] = useState<AssessmentDomain[]>([]);
    const [questions, setQuestions] = useState<AssessmentItem[]>([]);
    const [weaknesses, setWeaknesses] = useState<AssessmentItem[]>([]);
    const [strengths, setStrengths] = useState<AssessmentItem[]>([]);

    // Filter State
    // Filter State
    const [faculties, setFaculties] = useState<FacultyOption[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);

    const [majors, setMajors] = useState<MajorOption[]>([]);
    const [selectedMajor, setSelectedMajor] = useState<number | null>(null);

    const [teachers, setTeachers] = useState<TeacherOption[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);

    const [teacherData, setTeacherData] = useState<EntityScore[]>([]);
    const [peerData, setPeerData] = useState<(EntityScore & { isCurrent: boolean })[]>([]);
    const [groupedFeedback, setGroupedFeedback] = useState<GroupedFeedback[]>([]);

    const [isCalculating, setIsCalculating] = useState(false);


    const fetchData = async () => {
        if (!selectedRound) return;
        setLoading(true);
        try {
            const token = await getSessionToken();
            const supabase = getSupabaseClient(token);

            // 1. Fetch Assessment Structure (Heads & Details)
            const { data: heads, error: headError } = await supabase
                .from('assessment_head')
                .select('*')
                .eq('around_id', selectedRound)
                .order('section1', { ascending: true });

            if (headError) throw headError;

            const { data: details, error: detailError } = await supabase
                .from('assessment_detail')
                .select('*')
                .eq('around_id', selectedRound)
                .order('id', { ascending: true }); // We'll sort by section2 logically later

            if (detailError) throw detailError;

            // 2. Fetch Aggregated Statistics (avg_teacher)
            const { data: avgData, error: avgError } = await supabase
                .from('avg_teacher')
                .select('*')
                .eq('around_id', selectedRound);

            if (avgError) throw avgError;

            // 3. Fetch All Hierarchy Data
            const [
                { data: facultiesData },
                { data: majorsData },
                { data: roomsData },
                { data: relData },
                { data: teachersData }
            ] = await Promise.all([
                supabase.from('faculties').select('id, faculty_name'),
                supabase.from('majors').select('id, major_name, faculty_id'),
                supabase.from('rooms').select('id, major_id'),
                supabase.from('teacher_relationship').select('teacher_id, room_id'),
                supabase.from('teachers').select('id, teacher_name').order('teacher_name')
            ]);

            // Construct Maps and Lists
            if (facultiesData) {
                setFaculties(facultiesData.map(f => ({ id: f.id, name: f.faculty_name })));
            }

            if (majorsData) {
                setMajors(majorsData.map(m => ({ id: m.id, name: m.major_name, faculty_id: m.faculty_id })));
            }

            // Map Teachers to Majors
            // Teacher -> Relationship -> Room -> Major
            const roomMajorMap = new Map<number, number>(); // room_id -> major_id
            roomsData?.forEach(r => roomMajorMap.set(r.id, r.major_id));

            const teacherMajorMap = new Map<number, number>(); // teacher_id -> major_id
            relData?.forEach(rel => {
                if (rel.room_id && rel.teacher_id) {
                    const mId = roomMajorMap.get(rel.room_id);
                    if (mId) teacherMajorMap.set(rel.teacher_id, mId);
                }
            });

            if (teachersData) {
                const mappedTeachers = teachersData.map(t => ({
                    id: t.id,
                    name: t.teacher_name,
                    major_id: teacherMajorMap.get(t.id) // Map back to major
                }));

                // Sort by name
                mappedTeachers.sort((a, b) => a.name.localeCompare(b.name));
                setTeachers(mappedTeachers);
            }

            const teacherMap = new Map<number, string>();
            teachersData?.forEach(t => teacherMap.set(t.id, t.teacher_name));

            // 4. Fetch Participation Counts (Keep simple counts for cards)
            const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
            const { count: tCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });

            // Note: This logic might need refinement to count "by teacher" accurately if needed
            const { data: uniqueStudents } = await supabase
                .from('assessment_answer')
                .select('student_id')
                .eq('around_id', selectedRound)
                .neq('score_value', null);

            const { data: uniqueTeachers } = await supabase
                .from('assessment_answer')
                .select('teacher_id')
                .eq('around_id', selectedRound);

            setTotalStudentsInSystem(sCount || 0);
            setTotalTeachersInSystem(tCount || 0);
            setParticipatedStudents(new Set(uniqueStudents?.map(x => x.student_id)).size);
            setParticipatedTeachers(new Set(uniqueTeachers?.map(x => x.teacher_id)).size);

            // A. Process Structure
            const domainMap = new Map<number, string>(); // section1 -> name
            heads?.forEach(h => {
                domainMap.set(h.section1, h.head_description || h.description || `ด้านที่ ${h.section1}`);
            });

            // B. Identify Valid Questions & Title Headers
            const validQuestionIds = new Set<number>();
            const validQuestionsList: any[] = [];
            const detailTitleMap = new Map<string, string>(); // "section1-integerSection2" -> detail text

            details?.forEach(d => {
                const sec2Num = Number(d.section2);
                if (d.type === 'score') {
                    validQuestionIds.add(d.id);
                    validQuestionsList.push(d);
                } else if (Number.isInteger(sec2Num)) {
                    detailTitleMap.set(`${d.section1}-${sec2Num}`, d.detail);
                }
            });

            // B. Calculate Question Averages
            const questionStats = new Map<number, { sum: number, count: number }>();
            const teacherStats = new Map<number, { sum: number, count: number }>();
            let globalSum = 0;
            let globalCount = 0;

            // Filter avgData (if teacher is selected)
            const filteredAvgData = selectedTeacher
                ? avgData?.filter(r => r.teacher_id === selectedTeacher)
                : avgData;

            filteredAvgData?.forEach(row => {
                if (!validQuestionIds.has(row.question_id)) return;
                const totalScore = Number(row.total_score);
                const respondents = row.respondent_count;
                const qId = row.question_id;
                const tId = row.teacher_id;

                if (!questionStats.has(qId)) questionStats.set(qId, { sum: 0, count: 0 });
                const qS = questionStats.get(qId)!;
                qS.sum += totalScore;
                qS.count += respondents;

                if (!teacherStats.has(tId)) teacherStats.set(tId, { sum: 0, count: 0 });
                const tS = teacherStats.get(tId)!;
                tS.sum += totalScore;
                tS.count += respondents;

                globalSum += totalScore;
                globalCount += respondents;
            });

            // C. Map Details to Questions List
            const processedQuestions: AssessmentItem[] = [];
            const domainScores = new Map<number, { sum: number, count: number }>();
            const domainNames = new Map<number, string>();

            validQuestionsList.forEach(d => {
                const stats = questionStats.get(d.id) || { sum: 0, count: 0 };
                const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                const section2Val = Number(d.section2);
                const domainKey = Math.floor(section2Val);
                const sectionName = detailTitleMap.get(`${d.section1}-${domainKey}`) ||
                    domainMap.get(d.section1) ||
                    `ด้านที่ ${domainKey}`;

                domainNames.set(domainKey, sectionName);

                if (!domainScores.has(domainKey)) domainScores.set(domainKey, { sum: 0, count: 0 });
                const dS = domainScores.get(domainKey)!;
                dS.sum += stats.sum;
                dS.count += stats.count;

                processedQuestions.push({
                    id: d.id,
                    section: d.section2.toString(),
                    domain: sectionName,
                    text: d.detail,
                    score: Number(avg.toFixed(2))
                });
            });

            // D. Prepare Domain Data for Radar
            const finalDomainData: AssessmentDomain[] = Array.from(domainScores.entries()).map(([domainKey, stats]) => {
                const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                const name = domainNames.get(domainKey) || `ด้านที่ ${domainKey}`;
                return {
                    id: domainKey.toString(),
                    name: name,
                    subject: `ด้านที่ ${domainKey}`,
                    score: Number(avg.toFixed(2)),
                    fullMark: 5,
                    A: Number(avg.toFixed(2))
                };
            }).sort((a, b) => Number(a.id) - Number(b.id));

            // E. Prepare Teacher Data for Bar Chart
            const computedTeacherData: EntityScore[] = Array.from(teacherStats.entries()).map(([tId, stats]) => {
                const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                return {
                    name: teacherMap.get(tId) || `Teacher ${tId}`,
                    score: Number(avg.toFixed(2))
                };
            }).sort((a, b) => b.score - a.score);

            // E2. Prepare Peer Comparison Data (Same Major)
            let finalPeerData: (EntityScore & { isCurrent: boolean })[] = [];
            if (selectedTeacher && teachersData) {
                const currentTeacherObj = teachersData.find(t => t.id === selectedTeacher);
                const currentMajorId = teacherMajorMap.get(selectedTeacher);

                if (currentMajorId) {
                    const peerStatsLocal = new Map<number, { sum: number, count: number }>();

                    avgData?.forEach(row => {
                        // Must verify row.teacher_id belongs to currentMajorId
                        const tMajor = teacherMajorMap.get(row.teacher_id);
                        if (tMajor === currentMajorId) {
                            if (!peerStatsLocal.has(row.teacher_id)) peerStatsLocal.set(row.teacher_id, { sum: 0, count: 0 });
                            const s = peerStatsLocal.get(row.teacher_id)!;
                            s.sum += Number(row.total_score);
                            s.count += row.respondent_count; // note: avg_teacher has respondent_count per question, so summing them is technically correct for weighting, but for "Teacher Average" we usually want (Sum of All Scores) / (Sum of All Counts). Yes, that's what I'm doing.
                        }
                    });

                    finalPeerData = Array.from(peerStatsLocal.entries()).map(([tId, stats]) => {
                        const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                        return {
                            name: teacherMap.get(tId) || `Teacher ${tId}`,
                            score: Number(avg.toFixed(2)),
                            isCurrent: tId === selectedTeacher
                        };
                    }).sort((a, b) => b.score - a.score);
                }
            }

            // F. Final Set State
            const finalOverall = globalCount > 0 ? (globalSum / globalCount) : 0;
            const sortedItems = [...processedQuestions].sort((a, b) => b.score - a.score);

            setOverallScore(Number(finalOverall.toFixed(2)));
            setDomainData(finalDomainData);
            setQuestions(processedQuestions);
            setTeacherData(computedTeacherData);
            setPeerData(finalPeerData);
            setStrengths(sortedItems.slice(0, 3));
            setWeaknesses(sortedItems.slice(-3).reverse());

            // G. Fetch Text Feedback (Comments)
            // Only if a specific teacher AND round is selected
            if (selectedTeacher && selectedRound) {
                const { data: commentsData } = await supabase
                    .from('assessment_answer')
                    .select(`
                        id,
                        text_value,
                        question_id
                    `)
                    .eq('around_id', selectedRound)
                    .eq('teacher_id', selectedTeacher)
                    .neq('text_value', 'NULL') // Check string 'NULL' based on schema default
                    .not('text_value', 'is', null); // Check actual null just in case

                if (commentsData) {
                    // Map Question Details
                    const questionDetailMap = new Map<number, { text: string, section: string }>();
                    details?.forEach(d => {
                        questionDetailMap.set(d.id, { text: d.detail, section: d.section2.toString() });
                    });

                    // Group by Question ID
                    const feedbackMap = new Map<number, GroupedFeedback>();

                    commentsData.forEach(c => {
                        const qInfo = questionDetailMap.get(c.question_id);
                        if (!c.text_value || c.text_value.trim() === '') return;

                        if (!feedbackMap.has(c.question_id)) {
                            feedbackMap.set(c.question_id, {
                                question_id: c.question_id,
                                question_text: qInfo?.text || `Question ${c.question_id}`,
                                section: qInfo?.section || '-',
                                comments: []
                            });
                        }
                        feedbackMap.get(c.question_id)?.comments.push(c.text_value);
                    });

                    // Convert to Array and Sort by Section
                    const processedGrouped = Array.from(feedbackMap.values()).sort((a, b) => {
                        // Simple sort by section number strings
                        return a.section.localeCompare(b.section, undefined, { numeric: true });
                    });

                    setGroupedFeedback(processedGrouped);
                } else {
                    setGroupedFeedback([]);
                }
            } else {
                setGroupedFeedback([]);
            }

        } catch (err) {
            console.error("Error fetching overview data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        if (!selectedRound) return;
        setIsCalculating(true);
        try {
            // เปลี่ยนเป็น POST เพื่อความถูกต้องและปลอดภัย
            const response = await fetch('/api/avg', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    around_id: selectedRound,
                    triggered_by: 'client_manual_button' // ส่งค่าไปบอก Server ว่าใครเรียก
                }),
            });

            const result = await response.json(); // อ่านข้อความตอบกลับจาก API

            if (response.ok) {
                // alert(result.message); // (เลือกได้) แจ้งเตือน user ว่าเสร็จแล้ว

                // ไม่จำเป็นต้องใช้ setTimeout นานๆ เพราะ API เรารอจนเสร็จค่อยตอบกลับมาอยู่แล้ว
                // แต่ใส่ไว้สักนิดเพื่อให้ Database commit ชัวร์ๆ ก็ได้ครับ
                setTimeout(() => {
                    fetchData();
                }, 500);
            } else {
                console.error("Failed:", result.message);
                alert("เกิดข้อผิดพลาด: " + result.message);
            }
        } catch (error) {
            console.error("Error recalculating:", error);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsCalculating(false);
        }
    };

    useEffect(() => {
        const fetchRounds = async () => {
            const token = await getSessionToken();
            const supabase = getSupabaseClient(token);

            // Updated to use assessment_head for round detection
            const { data, error } = await supabase
                .from('assessment_head')
                .select('around_id')
                .order('around_id', { ascending: false });

            if (data) {
                const uniqueRounds = Array.from(new Set(data.map(item => item.around_id)));
                setRounds(uniqueRounds);
                if (uniqueRounds.length > 0 && !selectedRound) {
                    setSelectedRound(uniqueRounds[0]);
                }
            }
            if (error) console.error("Error fetching rounds:", error);
        };
        fetchRounds();
    }, [selectedRound]);

    // Auto-Select Hierarchy Logic

    // 1. Auto-select Faculty
    useEffect(() => {
        if (faculties.length > 0 && !selectedFaculty) {
            setSelectedFaculty(faculties[0].id);
        }
    }, [faculties, selectedFaculty]);

    // 2. Auto-select Major based on Faculty
    useEffect(() => {
        if (selectedFaculty && majors.length > 0) {
            const availableMajors = majors.filter(m => m.faculty_id === selectedFaculty);
            if (availableMajors.length > 0) {
                const currentIsValid = availableMajors.some(m => m.id === selectedMajor);
                if (!currentIsValid) setSelectedMajor(availableMajors[0].id);
            } else {
                setSelectedMajor(null);
            }
        } else if (!selectedFaculty) {
            // Optional: Reset if no faculty
            setSelectedMajor(null);
        }
    }, [selectedFaculty, majors, selectedMajor]);

    // 3. Auto-select Teacher based on Major
    useEffect(() => {
        if (selectedMajor && teachers.length > 0) {
            // Filter teachers belonging to this major
            const availableTeachers = teachers.filter(t => t.major_id === selectedMajor);

            if (availableTeachers.length > 0) {
                const currentIsValid = availableTeachers.some(t => t.id === selectedTeacher);
                if (!currentIsValid) setSelectedTeacher(availableTeachers[0].id);
            } else {
                setSelectedTeacher(null);
            }
        } else if (!selectedMajor) {
            setSelectedTeacher(null);
        }
    }, [selectedMajor, teachers, selectedTeacher]);

    useEffect(() => {
        if (selectedRound) {
            fetchData();
        }
    }, [selectedRound, selectedTeacher]);

    const getScoreColor = (score: number) => {
        if (score >= 4.5) return 'text-emerald-500 bg-emerald-500/10';
        if (score >= 4.0) return 'text-sky-500 bg-sky-500/10';
        if (score >= 3.0) return 'text-amber-500 bg-amber-500/10';
        return 'text-rose-500 bg-rose-500/10';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">กำลังประมวลผลข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Nav Header */}
            <div className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-40 px-4 md:px-6 py-4 transition-all shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl text-white shadow-lg shadow-blue-500/20 shrink-0">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
                                Dashboard อาจารย์
                            </h1>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">สถิติและผลการประเมินรายบุคคล</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto overflow-x-auto pb-1 sm:pb-0">
                        {/* Faculty Dropdown */}
                        <div className="relative group min-w-[180px]">
                            <select
                                value={selectedFaculty || ''}
                                onChange={(e) => {
                                    setSelectedFaculty(e.target.value ? Number(e.target.value) : null);
                                    // Reset downstream
                                    setSelectedMajor(null);
                                    setSelectedTeacher(null);
                                }}
                                className="w-full appearance-none pl-11 pr-10 py-3 bg-white border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                            >
                                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90 group-hover:text-indigo-500 transition-colors" />
                        </div>

                        {/* Major Dropdown */}
                        <div className="relative group min-w-[180px]">
                            <select
                                value={selectedMajor || ''}
                                onChange={(e) => {
                                    setSelectedMajor(e.target.value ? Number(e.target.value) : null);
                                    setSelectedTeacher(null);
                                }}
                                className="w-full appearance-none pl-11 pr-10 py-3 bg-white border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                            >
                                {majors
                                    .filter(m => !selectedFaculty || m.faculty_id === selectedFaculty)
                                    .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90 group-hover:text-indigo-500 transition-colors" />
                        </div>

                        {/* Teacher Dropdown */}
                        <div className="relative group min-w-[180px]">
                            <select
                                value={selectedTeacher || ''}
                                onChange={(e) => setSelectedTeacher(e.target.value ? Number(e.target.value) : null)}
                                className="w-full appearance-none pl-11 pr-10 py-3 bg-white border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                            >
                                {teachers
                                    .filter(t => !selectedMajor || t.major_id === selectedMajor)
                                    .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90 group-hover:text-indigo-500 transition-colors" />
                        </div>

                        <div className="relative group min-w-[150px]">
                            <select
                                value={selectedRound || ''}
                                onChange={(e) => setSelectedRound(Number(e.target.value))}
                                className="w-full appearance-none pl-11 pr-10 py-3 bg-white border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                            >
                                {rounds.map(r => <option key={r} value={r}>{formatRoundId(r)}</option>)}
                            </select>
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90 group-hover:text-indigo-500 transition-colors" />
                        </div>

                        <button
                            onClick={() => {
                                if (selectedRound) {
                                    const printData = {
                                        overallScore,
                                        participatedStudents,
                                        domainData,
                                        questions,
                                        strengths,
                                        weaknesses,
                                        teacherData,
                                        peerData,
                                        groupedFeedback,
                                        selectedTeacher,
                                        selectedFaculty,
                                        selectedMajor,
                                        timestamp: Date.now()
                                    };
                                    localStorage.setItem('printData_individual', JSON.stringify(printData));
                                    const url = `/admin/overview/individual/print?round=${selectedRound}${selectedTeacher ? `&teacher=${selectedTeacher}` : ''}`;
                                    window.open(url, '_blank');
                                }
                            }}
                            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 active:scale-95 transition-all w-full sm:w-auto shrink-0 whitespace-nowrap"
                        >
                            <Download size={18} />
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-10 space-y-10 relative z-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/10 transition-colors duration-700" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <Award size={32} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-blue-50 text-blue-600 rounded-full mb-1">Performance</span>
                                    <span className="text-[10px] font-bold text-slate-400">Score Rating</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">คะแนนเฉลี่ยรวม</p>
                            <div className="flex items-baseline gap-3 mt-2">
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter transition-all group-hover:text-blue-600">
                                    {overallScore.toFixed(2)}
                                </h1>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-lg mt-1">
                                        <TrendingUp size={12} />
                                        <span>Good</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50 group-hover:bg-blue-50/50 transition-colors">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Growth</p>
                                    <p className="text-sm font-bold text-slate-700">Stable</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50 group-hover:bg-blue-50/50 transition-colors">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                                    <p className="text-sm font-bold text-slate-700">Excellent</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-violet-500/10 transition-colors duration-700" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="p-4 bg-violet-50 rounded-2xl text-violet-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <Users size={32} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1 bg-violet-50 text-violet-700 rounded-full mb-1">
                                        <CheckCircle size={14} className="fill-violet-700/20" />
                                        Active
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">Participation</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">จำนวนผู้ประเมิน (นักศึกษา)</p>
                            <div className="flex items-baseline gap-3 mt-2">
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter transition-all group-hover:text-violet-600">
                                    {participatedStudents.toLocaleString()}
                                </h1>
                                <div className="flex flex-col">
                                    <span className="text-xl text-slate-300 font-bold">Students</span>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-400 to-indigo-600 rounded-full transition-all duration-1000 ease-out animate-pulse"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Highlights: Strengths & Weaknesses */}
                {(strengths.length > 0 || weaknesses.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Strengths */}
                        <div className="bg-emerald-50/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-emerald-100/50 shadow-lg shadow-emerald-100/20 relative overflow-hidden group transition-all duration-500 hover:shadow-emerald-200/40">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">จุดแข็ง (Top 3 Strengths)</h3>
                            </div>
                            <div className="space-y-4">
                                {strengths.map((item, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100/50 flex items-center justify-between gap-4 transition-transform hover:scale-[1.02]">
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-bold text-slate-700 line-clamp-2" title={item.text}>{item.text}</p>
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col items-end">
                                            <span className="text-lg font-black text-emerald-600">{item.score.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weaknesses */}
                        <div className="bg-rose-50/50 backdrop-blur-sm p-8 rounded-[2.5rem] border border-rose-100/50 shadow-lg shadow-rose-100/20 relative overflow-hidden group transition-all duration-500 hover:shadow-rose-200/40">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                                    <AlertCircle size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">สิ่งที่ควรพัฒนา (Improvements)</h3>
                            </div>
                            <div className="space-y-4">
                                {weaknesses.map((item, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100/50 flex items-center justify-between gap-4 transition-transform hover:scale-[1.02]">
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-bold text-slate-700 line-clamp-2" title={item.text}>{item.text}</p>
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col items-end">
                                            <span className="text-lg font-black text-rose-600">{item.score.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Radar Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Domain Radar */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-white p-10 shadow-xl shadow-slate-200/50 flex flex-col group transition-all duration-500">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                        <TrendingUp size={20} />
                                    </div>
                                    จุดแข็ง-จุดอ่อน (รายด้าน)
                                </h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium">วิเคราะห์คะแนนเฉลี่ยในแต่ละด้านของการประเมิน</p>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center min-h-[380px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={domainData}>
                                    <PolarGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }}
                                    />
                                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Level Score"
                                        dataKey="A"
                                        stroke="#4F46E5"
                                        strokeWidth={3}
                                        fill="#4F46E5"
                                        fillOpacity={0.15}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '24px',
                                            border: 'none',
                                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                            padding: '16px 20px',
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        itemStyle={{ color: '#4F46E5', fontWeight: 800 }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-10 pt-8 border-t border-slate-50 grid grid-cols-1 gap-6">
                            {domainData.map((d, i) => (
                                <div key={i} className="flex items-start gap-4 group/item">
                                    <div>
                                        <p className="text-sm text-slate-600 font-bold group-hover/item:text-slate-900 transition-colors uppercase leading-tight">{d.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Question Radar */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-white p-10 shadow-xl shadow-slate-200/50 flex flex-col group transition-all duration-500">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                        <Target size={20} />
                                    </div>
                                    วิเคราะห์รายประเด็น
                                </h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium">เปรียบเทียบผลลัพธ์ในหัวข้อคำถามย่อยทั้งหมด</p>
                            </div>
                        </div>

                        {(() => {
                            // Sort questions strictly by section number (1.1, 1.2, 1.10 etc) instead of alphabetic string sort
                            const sortedQuestions = [...questions].sort((a, b) => {
                                const parseSection = (s: string) => s.split('.').map(Number);
                                const aParts = parseSection(a.section);
                                const bParts = parseSection(b.section);

                                // Compare parts
                                for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                                    const valA = aParts[i] || 0;
                                    const valB = bParts[i] || 0;
                                    if (valA !== valB) return valA - valB;
                                }
                                return 0;
                            });
                            return (
                                <>
                                    <div className="flex-1 flex items-center justify-center min-h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sortedQuestions.map((q, i) => ({ subject: (i + 1).toString(), A: q.score, fullText: q.text }))}>
                                                <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                                                <PolarAngleAxis
                                                    dataKey="subject"
                                                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                                />
                                                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                                                <Radar
                                                    name="Score"
                                                    dataKey="A"
                                                    stroke="#6366F1"
                                                    strokeWidth={3}
                                                    fill="#6366F1"
                                                    fillOpacity={0.2}
                                                />
                                                <Tooltip labelFormatter={(v, p) => `ข้อที่ ${v}: ${p[0]?.payload?.fullText}`} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <div className="space-y-3">
                                            {sortedQuestions.map((q, i) => (
                                                <div key={i} className="flex items-start gap-3 text-sm group hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{q.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden group">
                    <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                                    <FileText size={22} />
                                </div>
                                การวิเคราะห์เชิงลึก
                            </h3>
                            <p className="text-slate-400 text-sm mt-1 font-medium italic">ตารางรวมผลคะแนนแยกตามหัวข้อและประเด็นคำถามย่อย</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <div className="px-3 py-1 bg-white rounded-lg shadow-sm text-[10px] font-black uppercase text-indigo-600">Rows: {questions.length}</div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-1/2">หัวข้อและข้อคำถาม</th>
                                    <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] text-center w-40">เกณฑ์คะแนน</th>
                                    <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] text-center w-32">คะแนนเฉลี่ย</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(
                                    questions.reduce((acc, q) => {
                                        if (!acc[q.domain]) acc[q.domain] = [];
                                        acc[q.domain].push(q);
                                        return acc;
                                    }, {} as Record<string, AssessmentItem[]>)
                                ).map(([domain, domainQuestions], idx) => (
                                    <React.Fragment key={domain}>
                                        <tr className="bg-indigo-50/30">
                                            <td colSpan={3} className="px-8 py-5">
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                                    {domain}
                                                </span>
                                            </td>
                                        </tr>
                                        {domainQuestions.map((q, i) => (
                                            <tr key={`${idx}-${i}`} className="hover:bg-white group transition-all duration-300">
                                                <td className="px-10 py-5 pl-16">
                                                    <div className="flex items-start gap-4">
                                                        <p className="text-slate-500 text-sm leading-relaxed font-medium group-hover:text-slate-900 transition-colors">
                                                            {q.text}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="w-full bg-slate-100/60 rounded-full h-2 overflow-hidden shadow-inner flex items-center px-0.5">
                                                        <div
                                                            className={`h-1 rounded-full transition-all duration-1000 ease-out shadow-sm ${q.score >= 4.5 ? 'bg-emerald-500 shadow-emerald-200' :
                                                                q.score >= 4.0 ? 'bg-indigo-500 shadow-indigo-200' :
                                                                    q.score >= 3.0 ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-500 shadow-rose-200'
                                                                }`}
                                                            style={{ width: `${(q.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-2xl text-xs font-black shadow-sm group-hover:scale-110 transition-transform ${getScoreColor(q.score)}`}>
                                                        {q.score.toFixed(2)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {groupedFeedback.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden group">
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                    <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                                        <MessageSquare size={22} />
                                    </div>
                                    ข้อเสนอแนะเพิ่มเติม
                                </h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium italic">ความคิดเห็นและข้อเสนอแนะจากผู้ประเมิน</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <div className="px-3 py-1 bg-white rounded-lg shadow-sm text-[10px] font-black uppercase text-indigo-600">
                                        Topics: {groupedFeedback.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] w-1/3">ประเด็นคำถาม</th>
                                        <th className="px-8 py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">ข้อเสนอแนะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {groupedFeedback.map((group) => (
                                        <tr key={group.question_id} className="hover:bg-rose-50/10 transition-colors">
                                            <td className="px-8 py-6 align-top">
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed max-w-[300px]">{group.question_text}</p>
                                            </td>
                                            <td className="px-8 py-6 align-top">
                                                <div className="space-y-3">
                                                    {group.comments.map((comment, i) => (
                                                        <div key={i} className="flex gap-3">
                                                            <div className="p-3 bg-slate-50 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap w-full hover:bg-white hover:shadow-sm transition-all">
                                                                {comment}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }

                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div >
    );
}
