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
    Users,
    Calendar,
    Target,
    Award,
    FileText,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import { formatRoundId } from '@/lib/utils/round-formatter';

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
    isCurrent?: boolean;
}

interface GroupedFeedback {
    question_id: number;
    question_text: string;
    section: string;
    comments: string[];
}

export default function OverviewPDF() {
    const searchParams = useSearchParams();
    const roundIdParam = searchParams.get('round');
    const teacherIdParam = searchParams.get('teacher');

    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState<number | null>(roundIdParam ? Number(roundIdParam) : null);
    const [selectedTeacher, setSelectedTeacher] = useState<number | null>(teacherIdParam ? Number(teacherIdParam) : null);

    // Data State
    const [overallScore, setOverallScore] = useState(0);
    const [participatedStudents, setParticipatedStudents] = useState(0);
    const [domainData, setDomainData] = useState<AssessmentDomain[]>([]);
    const [questions, setQuestions] = useState<AssessmentItem[]>([]);
    const [strengths, setStrengths] = useState<AssessmentItem[]>([]);
    const [weaknesses, setWeaknesses] = useState<AssessmentItem[]>([]);
    const [teacherData, setTeacherData] = useState<EntityScore[]>([]);
    const [peerData, setPeerData] = useState<EntityScore[]>([]);
    const [groupedFeedback, setGroupedFeedback] = useState<GroupedFeedback[]>([]);

    useEffect(() => {
        const localDataString = localStorage.getItem('printData_individual_teacher');
        if (localDataString) {
            try {
                const localData = JSON.parse(localDataString);
                // Basic freshness check (30 mins)
                if (Date.now() - localData.timestamp < 30 * 60 * 1000) {
                    setOverallScore(localData.overallScore);
                    setParticipatedStudents(localData.participatedStudents);
                    setDomainData(localData.domainData);
                    setQuestions(localData.questions);
                    setStrengths(localData.strengths);
                    setWeaknesses(localData.weaknesses);
                    setTeacherData(localData.teacherData);
                    setPeerData(localData.peerData);
                    setGroupedFeedback(localData.groupedFeedback);

                    if (localData.selectedTeacher) setSelectedTeacher(localData.selectedTeacher);
                    if (localData.selectedRound) setSelectedRound(localData.selectedRound);

                    setLoading(false);
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("Error parsing local print data", e);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const chartData = selectedTeacher ? peerData : teacherData;
    const chartTitle = selectedTeacher ? "เปรียบเทียบกับอาจารย์ในสาขา (Peer Comparison)" : "ผลการประเมินรายบุคคล (Ranking)";

    if (loading) return <div className="p-10 text-center font-bold text-slate-500">Generating Report...</div>;

    return (
        <div className="bg-white min-h-screen p-8 text-slate-900 leading-normal w-[210mm] mx-auto print:p-0 print:w-full print:m-0">
            {/* Header Report */}
            <div className="flex items-center justify-between mb-8 border-b pb-6 border-slate-200 print:mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">รายงานผลการประเมินรายบุคคล</h1>
                    <p className="text-slate-500 font-bold mt-1">
                        ประจำรอบการประเมิน: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{selectedRound ? formatRoundId(selectedRound) : '-'}</span>
                    </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <button
                        onClick={() => window.print()}
                        className="no-print px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-slate-500/30 flex items-center gap-2 cursor-pointer"
                    >
                        <TrendingUp size={16} />
                        Print / Save PDF
                    </button>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Generated On</div>
                        <div className="text-base font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                            {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
                                    <Award size={28} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">Total Score</span>
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">คะแนนเฉลี่ยรวม</p>
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                                    {overallScore.toFixed(2)}
                                </h1>
                                <span className="text-sm font-bold text-slate-400">/ 5.00</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 bg-violet-50 rounded-2xl text-violet-600 border border-violet-100">
                                    <Users size={28} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">Participation</span>
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">จำนวนผู้ประเมิน</p>
                            <div className="flex items-center gap-3">
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                                    {participatedStudents.toLocaleString()}
                                </h1>
                                <span className="text-sm font-bold text-slate-400">คน (Students)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radar & Chart Section */}
                <div className="flex flex-col gap-6 break-inside-avoid">
                    {/* Domain Radar */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="w-full mb-4 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Radar className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-800">จุดแข็ง-จุดอ่อน (รายด้าน)</h3>
                        </div>
                        <div className="w-full h-[300px] relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={domainData}>
                                    <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                    />
                                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Score"
                                        dataKey="A"
                                        stroke="#4f46e5"
                                        strokeWidth={3}
                                        fill="#6366f1"
                                        fillOpacity={0.2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full mt-4 flex flex-col gap-2">
                            {domainData.map((d, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-600">{d.name}</span>
                                    <span className="text-xs font-black text-slate-800">{d.score.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Question Radar */}
                <div className="flex flex-col gap-6 break-inside-avoid">
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
                                const parseSection = (s: string) => {
                                    if (!s) return [0];
                                    return String(s).split('.').map(Number);
                                };
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
                                    <div className="w-full h-[200px] mt-4 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sortedQuestions.map((q, i) => ({ subject: (i + 1).toString(), A: q.score, fullText: q.text }))}>
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
                                                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                                                    <span className="text-[10px] font-bold text-slate-600">{q.text}</span>
                                                    <span className="text-xs font-black text-slate-800">{q.score.toFixed(2)}</span>
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
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden break-inside-avoid shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-black text-slate-900 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl text-slate-700 border border-slate-200 shadow-sm">
                                <FileText size={20} />
                            </div>
                            การวิเคราะห์เชิงลึก (Detailed Analysis)
                        </h3>
                    </div>
                    <div className="p-2">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider w-[65%]">หัวข้อและข้อคำถาม</th>
                                    <th className="px-2 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider text-center w-[20%]">เกณฑ์คะแนน</th>
                                    <th className="px-2 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider text-center w-[15%]">เฉลี่ย</th>
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
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={3} className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-slate-800 uppercase bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                                        {domain}
                                                    </span>
                                                    <span className="ml-auto text-[10px] font-black text-slate-500">
                                                        AVG: {(domainQuestions.reduce((sum, q) => sum + q.score, 0) / domainQuestions.length).toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {domainQuestions.map((q, i) => (
                                            <tr key={`${idx}-${i}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 pl-10 align-top">
                                                    <p className="text-slate-600 text-xs font-bold leading-relaxed">{q.text}</p>
                                                </td>
                                                <td className="px-2 py-3 align-middle">
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${q.score >= 4.5 ? 'bg-emerald-500' : q.score >= 4.0 ? 'bg-indigo-500' : q.score >= 3.0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                            style={{ width: `${(q.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center align-middle">
                                                    <span className={`font-black text-xs ${q.score >= 4.0 ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                        {q.score.toFixed(2)}
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

                {/* Feedback Table */}
                {groupedFeedback.length > 0 && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden break-inside-avoid shadow-sm group">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl text-rose-600 border border-slate-200 shadow-sm">
                                    <MessageSquare size={20} />
                                </div>
                                ข้อเสนอแนะเพิ่มเติม (Additional Feedback)
                            </h3>
                            <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-sm text-[10px] font-black uppercase text-slate-500">
                                Topics: {groupedFeedback.length}
                            </div>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider w-[30%]">ประเด็นคำถาม</th>
                                        <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-wider w-[70%]">ข้อเสนอแนะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {groupedFeedback.map((group) => (
                                        <tr key={group.question_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <p className="text-xs font-bold text-slate-700 leading-relaxed bg-slate-50 px-3 py-2 rounded-xl inline-block max-w-full">
                                                    {group.question_text}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="space-y-2">
                                                    {group.comments.map((comment, i) => (
                                                        <div key={i} className="flex gap-3">
                                                            <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none text-xs text-slate-600 font-medium leading-relaxed shadow-sm w-full">
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
                @media print {
                    @page { 
                        size: A4; 
                        margin: 8mm; 
                    }
                    body { 
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
}
