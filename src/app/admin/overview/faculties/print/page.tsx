"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LabelList,
    Tooltip
} from 'recharts';
import {
    TrendingUp,
    CheckCircle,
    Building2,
    Calendar,
    Target,
    Award,
    FileText,
    Loader2
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

interface FacultyScore {
    name: string;
    score: number;
}

export default function OverviewPDF() {
    const searchParams = useSearchParams();
    const roundIdParam = searchParams.get('round');
    const facultyIdParam = searchParams.get('faculty');

    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState<number | null>(roundIdParam ? Number(roundIdParam) : null);
    const [selectedFaculty, setSelectedFaculty] = useState<number | null>(facultyIdParam ? Number(facultyIdParam) : null);

    // Data State
    const [overallScore, setOverallScore] = useState(0);
    const [participatedTeachers, setParticipatedTeachers] = useState(0);
    const [totalTeachersInSystem, setTotalTeachersInSystem] = useState(0);
    const [domainData, setDomainData] = useState<AssessmentDomain[]>([]);
    const [questions, setQuestions] = useState<AssessmentItem[]>([]);
    const [facultyData, setFacultyData] = useState<FacultyScore[]>([]);

    const fetchData = async () => {
        // Try to load from localStorage first
        const localDataString = localStorage.getItem('printData');
        if (localDataString) {
            try {
                const localData = JSON.parse(localDataString);
                // Check if data is fresh enough (e.g., created within last 30 minutes)
                if (Date.now() - localData.timestamp < 30 * 60 * 1000) {
                    setOverallScore(localData.overallScore);
                    setParticipatedTeachers(localData.participatedTeachers);
                    setTotalTeachersInSystem(localData.totalTeachersInSystem);
                    setDomainData(localData.domainData);
                    setQuestions(localData.questions);
                    setFacultyData(localData.facultyData);
                    setLoading(false);
                    // Clear it so future refreshes might fetch fresh data if needed, or keep it. 
                    // Keeping it allows refresh to work seamlessly.
                    return;
                }
            } catch (e) {
                console.error("Error parsing local print data", e);
            }
        }

        if (!selectedRound) return;
        setLoading(true);
        try {
            const token = await getSessionToken();
            const supabase = getSupabaseClient(token);

            // Fetch heads and details
            const { data: heads } = await supabase.from('assessment_head').select('*').eq('around_id', selectedRound).order('section1', { ascending: true });
            const { data: details } = await supabase.from('assessment_detail').select('*').eq('around_id', selectedRound).order('id', { ascending: true });
            const { data: avgData } = await supabase.from('avg_faculty').select('*').eq('around_id', selectedRound);
            const { data: facultiesData } = await supabase.from('faculties').select('id, faculty_name');
            const { data: majorsData } = await supabase.from('majors').select('id, major_name, faculty_id');

            const facultyMap = new Map<number, string>();
            facultiesData?.forEach(f => facultyMap.set(f.id, f.faculty_name));

            const majorMap = new Map<number, string>();
            const majorFacultyMap = new Map<number, number>();
            majorsData?.forEach(m => {
                majorMap.set(m.id, m.major_name);
                majorFacultyMap.set(m.id, m.faculty_id);
            });

            // Participation
            const { count: tCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
            const { data: uniqueTeachers } = await supabase.from('assessment_answer').select('teacher_id').eq('around_id', selectedRound);

            setTotalTeachersInSystem(tCount || 0);
            setParticipatedTeachers(new Set(uniqueTeachers?.map(x => x.teacher_id)).size);

            // Process Data (Similar logic to main page)
            const domainMap = new Map<number, string>();
            heads?.forEach(h => domainMap.set(h.section1, h.head_description || h.description || `ด้านที่ ${h.section1}`));

            const validQuestionIds = new Set<number>();
            const validQuestionsList: any[] = [];
            const detailTitleMap = new Map<string, string>();
            details?.forEach(d => {
                const sec2Num = Number(d.section2);
                if (d.type === 'score') {
                    validQuestionIds.add(d.id);
                    validQuestionsList.push(d);
                } else if (Number.isInteger(sec2Num)) {
                    detailTitleMap.set(`${d.section1}-${sec2Num}`, d.detail);
                }
            });

            const questionStats = new Map<number, { sum: number, count: number }>();
            const facultyStats = new Map<number, { sum: number, count: number }>();
            let globalSum = 0;
            let globalCount = 0;

            avgData?.forEach(row => {
                if (!validQuestionIds.has(row.question_id)) return;
                if (selectedFaculty && row.faculty_id !== selectedFaculty) return;

                const totalScore = Number(row.total_score);
                const respondents = row.respondent_count;
                const qId = row.question_id;
                const fId = row.faculty_id;

                if (!questionStats.has(qId)) questionStats.set(qId, { sum: 0, count: 0 });
                const qS = questionStats.get(qId)!;
                qS.sum += totalScore;
                qS.count += respondents;

                if (!facultyStats.has(fId)) facultyStats.set(fId, { sum: 0, count: 0 });
                const fS = facultyStats.get(fId)!;
                fS.sum += totalScore;
                fS.count += respondents;

                globalSum += totalScore;
                globalCount += respondents;
            });

            // Calculate Averages
            const processedQuestions: AssessmentItem[] = [];
            const domainScores = new Map<number, { sum: number, count: number }>();
            const domainNames = new Map<number, string>();

            validQuestionsList.forEach(d => {
                const stats = questionStats.get(d.id) || { sum: 0, count: 0 };
                const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                const section2Val = Number(d.section2);
                const domainKey = Math.floor(section2Val);
                const sectionName = detailTitleMap.get(`${d.section1}-${domainKey}`) || domainMap.get(d.section1) || `ด้านที่ ${domainKey}`;

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

            // Logic for Bar Chart (Faculty vs Major)
            let computedChartData: FacultyScore[] = [];
            if (selectedFaculty) {
                const majorStats = new Map<number, { sum: number, count: number }>();
                const { data: avgMajorData } = await supabase.from('avg_major').select('*').eq('around_id', selectedRound);

                if (avgMajorData) {
                    avgMajorData.forEach(row => {
                        if (!validQuestionIds.has(row.question_id)) return;
                        const mId = Number(row.major_id);
                        const fId = majorFacultyMap.get(mId);
                        if (fId === selectedFaculty) {
                            if (!majorStats.has(mId)) majorStats.set(mId, { sum: 0, count: 0 });
                            const mS = majorStats.get(mId)!;
                            mS.sum += Number(row.total_score);
                            mS.count += row.respondent_count;
                        }
                    });
                }
                computedChartData = Array.from(majorStats.entries()).map(([mId, stats]) => {
                    const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                    return {
                        name: majorMap.get(mId) || `Major ${mId}`,
                        score: Number(avg.toFixed(2))
                    };
                }).sort((a, b) => b.score - a.score);
            } else {
                computedChartData = Array.from(facultyStats.entries()).map(([fId, stats]) => {
                    const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                    return {
                        name: facultyMap.get(fId) || `Faculty ${fId}`,
                        score: Number(avg.toFixed(2))
                    };
                }).sort((a, b) => b.score - a.score);
            }

            const finalOverall = globalCount > 0 ? (globalSum / globalCount) : 0;
            setOverallScore(Number(finalOverall.toFixed(2)));
            setDomainData(finalDomainData);
            setQuestions(processedQuestions);
            setFacultyData(computedChartData);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedRound) {
            fetchData();
        }
    }, [selectedRound, selectedFaculty]);

    const getScoreColor = (score: number) => {
        if (score >= 4.5) return 'text-emerald-500 bg-emerald-500/10';
        if (score >= 4.0) return 'text-sky-500 bg-sky-500/10';
        if (score >= 3.0) return 'text-amber-500 bg-amber-500/10';
        return 'text-rose-500 bg-rose-500/10';
    };

    if (!selectedRound) return <div className="p-10 text-center">No Data Selected</div>;
    if (loading) return <div className="p-10 text-center">Generating Report...</div>;

    return (
        <div className="bg-white min-h-screen p-8 text-slate-900 leading-normal w-[210mm] mx-auto print:p-0 print:w-full">
            {/* Header Report */}
            <div className="flex items-center justify-between mb-8 border-b pb-6 border-slate-200">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">รายงานผลการประเมิน</h1>
                    <p className="text-slate-500 font-medium mt-1">
                        ประจำรอบการประเมิน: <span className="text-indigo-600 font-bold">{formatRoundId(selectedRound)}</span>
                    </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <button
                        onClick={() => window.print()}
                        className="no-print px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2"
                    >
                        <TrendingUp size={16} />
                        Export PDF
                    </button>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Generated On</div>
                        <div className="text-lg font-bold text-slate-700">
                            {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto pt-8 space-y-10 relative z-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-xl border border-slate-300 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="p-4 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                                    <Award size={32} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-600 rounded-lg mb-1 border border-slate-200">Performance</span>
                                    <span className="text-[10px] font-bold text-slate-400">Score Rating</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">คะแนนเฉลี่ยรวม</p>
                            <div className="flex items-baseline gap-3 mt-2">
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
                                    {overallScore.toFixed(2)}
                                </h1>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1">
                                        <TrendingUp size={12} />
                                        <span>Good</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Growth</p>
                                    <p className="text-sm font-bold text-slate-800">Stable</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                                    <p className="text-sm font-bold text-slate-800">Excellent</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-xl border border-slate-300 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="p-4 bg-violet-50 rounded-xl text-violet-600 border border-violet-100">
                                    <Building2 size={32} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-700 rounded-lg mb-1 border border-slate-200">
                                        <CheckCircle size={14} className="text-slate-500" />
                                        {((participatedTeachers / (totalTeachersInSystem || 1)) * 100).toFixed(1)}% Completed
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">Assessment Coverage</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">อาจารย์ที่ถูกประเมิน</p>
                            <div className="flex items-baseline gap-3 mt-2">
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
                                    {participatedTeachers.toLocaleString()}
                                </h1>
                                <div className="flex flex-col">
                                    <span className="text-xl text-slate-400 font-bold">/ {totalTeachersInSystem.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-400 mt-1">Total Mentors</span>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                    <div
                                        className="h-full bg-slate-800 rounded-full"
                                        style={{ width: `${(participatedTeachers / (totalTeachersInSystem || 1)) * 100}%` }}
                                    />
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-xs font-bold text-slate-500">
                                        {((participatedTeachers / (totalTeachersInSystem || 1)) * 100).toFixed(2)}% Completed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radar Charts Grid */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Domain Radar */}
                    <div className="bg-white rounded-xl border border-slate-300 p-8 break-inside-avoid">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                                        <TrendingUp size={20} />
                                    </div>
                                    จุดแข็ง-จุดอ่อน (รายด้าน)
                                </h3>
                                <p className="text-slate-500 text-sm mt-1 font-medium">วิเคราะห์คะแนนเฉลี่ยในแต่ละด้านของการประเมิน</p>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={domainData}>
                                    <PolarGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }}
                                    />
                                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Level Score"
                                        dataKey="A"
                                        stroke="#1e293b"
                                        strokeWidth={2}
                                        fill="#94a3b8"
                                        fillOpacity={0.3}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                            {domainData.map((d, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-bold text-slate-700">{d.name}</p>
                                    </div>
                                    <span className="font-bold text-slate-900">{d.score.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Question Radar */}
                    <div className="bg-white rounded-xl border border-slate-300 p-8 break-inside-avoid">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                                        <Target size={20} />
                                    </div>
                                    วิเคราะห์รายประเด็น
                                </h3>
                                <p className="text-slate-500 text-sm mt-1 font-medium">เปรียบเทียบผลลัพธ์ในหัวข้อคำถามย่อยทั้งหมด</p>
                            </div>
                        </div>

                        {(() => {
                            const sortedQuestions = [...questions].sort((a, b) => {
                                const parseSection = (s: string) => s.split('.').map(Number);
                                const aParts = parseSection(a.section);
                                const bParts = parseSection(b.section);
                                for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                                    const valA = aParts[i] || 0;
                                    const valB = bParts[i] || 0;
                                    if (valA !== valB) return valA - valB;
                                }
                                return 0;
                            });
                            return (
                                <>
                                    <div className="flex-1 flex items-center justify-center h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sortedQuestions.map((q, i) => ({ subject: (i + 1).toString(), A: q.score, fullText: q.text }))}>
                                                <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                                                <PolarAngleAxis
                                                    dataKey="subject"
                                                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                                                />
                                                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                                                <Radar
                                                    name="Score"
                                                    dataKey="A"
                                                    stroke="#1e293b"
                                                    strokeWidth={2}
                                                    fill="#94a3b8"
                                                    fillOpacity={0.3}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                            {sortedQuestions.map((q, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm py-1">
                                                    <span className="text-slate-700">{q.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Faculty Stats Section */}
                <div className="bg-white p-8 rounded-xl border border-slate-300 break-inside-avoid">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 pb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                                    <Building2 size={20} />
                                </div>
                                ผลการประเมินรายสาขา
                            </h3>
                        </div>
                    </div>

                    {facultyData.length > 0 ? (
                        <div className="w-auto " style={{ height: `${Math.max(facultyData.length * 50, 300)}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={facultyData.map((d, i) => ({ ...d, rank: i + 1 }))}
                                    layout="vertical"
                                    margin={{ top: 0, right: 60, left: 220, bottom: 0 }}
                                    barGap={10}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                    <XAxis type="number" domain={[0, 5.5]} hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={100}
                                        tick={({ x, y, payload, index }) => {
                                            const text = payload.value || "";
                                            // Split text into line chunks
                                            const maxLength = 50; // Tighter because width is 220
                                            const lines = [];
                                            for (let i = 0; i < text.length; i += maxLength) {
                                                lines.push(text.substring(i, i + maxLength));
                                            }
                                            // Take up to 2 lines
                                            const displayLines = lines.slice(0, 2);
                                            if (lines.length > 2) displayLines[1] += "...";

                                            return (
                                                <g transform={`translate(10,${y})`}>
                                                    <text
                                                        x={0}
                                                        y={-12}
                                                        className="fill-slate-400 text-[9px] font-black uppercase tracking-widest"
                                                        textAnchor="start"
                                                    >
                                                        RANK {index + 1}
                                                    </text>
                                                    {displayLines.map((line, i) => (
                                                        <text
                                                            key={i}
                                                            x={0}
                                                            y={6 + (i * 14)}
                                                            className="fill-slate-800 text-xs font-bold uppercase tracking-tight"
                                                            textAnchor="start"
                                                        >
                                                            {line}
                                                        </text>
                                                    ))}
                                                </g>
                                            );
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        cursor={{ fill: '#F8FAFC', radius: 4 }}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: 'none',
                                            padding: '8px 12px',
                                        }}
                                        formatter={(value: any) => [`${Number(value).toFixed(2)} Points`, 'Score']}
                                        labelStyle={{ color: '#1e293b', fontWeight: 700, marginBottom: '4px' }}
                                    />

                                    <Bar
                                        dataKey="score"
                                        fill="#334155"
                                        radius={[0, 4, 4, 0]}
                                        barSize={18}
                                    >
                                        <LabelList
                                            dataKey="score"
                                            position="right"
                                            offset={10}
                                            fill="#475569"
                                            fontSize={11}
                                            fontWeight={800}
                                            formatter={(val: any) => Number(val).toFixed(2)}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-slate-300">
                            <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No Data Available</p>
                        </div>
                    )}
                </div>


                {/* Detailed Table */}
                <div className="bg-white rounded-xl border border-slate-300 overflow-hidden break-inside-avoid">
                    <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                                    <FileText size={20} />
                                </div>
                                การวิเคราะห์เชิงลึก
                            </h3>
                        </div>
                    </div>
                    <div>
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider w-[65%]">หัวข้อและข้อคำถาม</th>
                                    <th className="px-2 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider text-center w-[20%]">เกณฑ์คะแนน</th>
                                    <th className="px-2 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider text-center w-[15%]">เฉลี่ย</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {Object.entries(
                                    questions.reduce((acc, q) => {
                                        if (!acc[q.domain]) acc[q.domain] = [];
                                        acc[q.domain].push(q);
                                        return acc;
                                    }, {} as Record<string, AssessmentItem[]>)
                                ).map(([domain, domainQuestions], idx) => (
                                    <React.Fragment key={domain}>
                                        <tr className="bg-slate-50/80">
                                            <td colSpan={3} className="px-4 py-2 border-t border-slate-200 border-b">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-900 uppercase">
                                                        {domain}
                                                    </span>
                                                    <span className="ml-auto text-xs font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                                        {domainQuestions.reduce((sum, q) => sum + q.score, 0) / domainQuestions.length > 0 ? (domainQuestions.reduce((sum, q) => sum + q.score, 0) / domainQuestions.length).toFixed(2) : "0.00"}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {domainQuestions.map((q, i) => (
                                            <tr key={`${idx}-${i}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 pl-8 align-top">
                                                    <div className="flex items-start gap-2">
                                                        <p className="text-slate-700 text-xs leading-relaxed font-medium">
                                                            {q.text}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 align-middle">
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${q.score >= 4.5 ? 'bg-emerald-500' :
                                                                q.score >= 4.0 ? 'bg-indigo-500' :
                                                                    q.score >= 3.0 ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`}
                                                            style={{ width: `${(q.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center align-middle">
                                                    <span className="font-bold text-slate-800 text-xs">{q.score.toFixed(2)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 8mm; }
                    body { 
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    );
}
