"use client";

import React, { useState } from "react";
import {
  Radar as RadarIcon,
  AlertCircle
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface RoomData {
  room_code: string;
  average: string;
}

interface QuestionData {
  text: string;
  average: string;
}

interface AspectData {
  id: number;
  text: string;
  average: string;
}

interface Props {
  roomStats: RoomData[];
  questionStats: QuestionData[];
  aspectStats: AspectData[];
  maxScore: number;
  minScore?: number;
  scoreDistribution: Record<number, number>;
}

const ChartTooltip = ({ text }: { text: string }) => (
  <span className="group relative inline-flex items-center ml-2 align-middle z-20">
    <AlertCircle size={16} className="text-slate-400 cursor-help hover:text-blue-500 transition-colors" />
    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-3 bg-slate-900/95 text-white/90 text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none text-left shadow-xl backdrop-blur-sm border border-white/10 invisible group-hover:visible translate-x-1 group-hover:translate-x-0">
      {text}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/95"></span>
    </span>
  </span>
);

// --- SVG HELPERS ---

// 1. CIRCULAR PROGRESS (For Averages)
const CircularRate = ({
  value,
  max,
  label,
  subLabel,
  color = "#2563eb", // blue-600
  size = 140, // Slightly smaller for better mobile fit
  index = 0
}: {
  value: number;
  max: number;
  label: string;
  subLabel?: string;
  color?: string;
  size?: number;
  index?: number;
}) => {
  const radius = size / 2;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / max) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className="relative flex items-center justify-center group cursor-pointer"
        style={{ width: size, height: size }}
      >
        {/* Shadow/Glow */}
        <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl scale-75 group-hover:scale-100 transition-transform duration-700" />

        <svg height={size} width={size} className="rotate-[-90deg] relative z-10 drop-shadow-sm">
          <circle
            stroke="#eff6ff" // blue-50
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{
              strokeDashoffset,
              transition: "stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 select-none">
          <span className="text-3xl font-black tracking-tighter">{value.toFixed(2)}</span>
          <span className="text-[10px] text-slate-400 font-black uppercase mt-0.5 tracking-widest">/ {max} คะแนน</span>
        </div>
      </div>
      <div className="mt-5 text-center px-2">
        <h5 className="text-lg font-black text-slate-800 leading-tight">{label}</h5>
        {subLabel && <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-70">{subLabel}</p>}
      </div>
    </div>
  );
};

// 2. ROOM BAR CHART (Comparison)
const RoomBarChart = ({ data, max }: { data: RoomData[]; max: number }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="h-72 w-full flex items-end justify-center gap-2 sm:gap-6 px-4 pb-8 border-b border-blue-50 relative overflow-x-auto no-scrollbar">
      {/* Y-Axis Grid */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 px-2 py-4">
        {[100, 75, 50, 25, 0].map((p) => (
          <div key={p} className="w-full h-px bg-slate-50 relative">
            <span className="absolute -left-2 top-[-6px] text-[8px] font-black text-slate-300 uppercase">{p}%</span>
          </div>
        ))}
      </div>

      {data.map((room) => {
        const val = parseFloat(room.average);
        const heightPercent = max > 0 ? (val / max) * 100 : 0;

        return (
          <div
            key={room.room_code}
            className="flex-1 min-w-[50px] sm:min-w-[80px] max-w-[120px] h-full flex flex-col justify-end group relative z-10"
            onMouseEnter={() => setHovered(room.room_code)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            <div
              className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-300 whitespace-nowrap z-20 shadow-2xl pointer-events-none border border-white/10 backdrop-blur-sm
               ${hovered === room.room_code ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90"}`}
            >
              เฉลี่ย: {val.toFixed(2)}
            </div>

            {/* Bar Container */}
            <div className="relative w-full h-full flex items-end px-1.5 sm:px-3">
              {/* Active Backdrop */}
              <div className={`absolute inset-x-0 bottom-0 bg-blue-50/50 rounded-t-[18px] transition-all duration-500 scale-x-110 ${hovered === room.room_code ? 'opacity-100 h-full' : 'opacity-0 h-0'}`} />

              {/* Animated Bar */}
              <div
                className={`w-full ${val >= 4 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-gradient-to-t from-blue-700 to-blue-400 shadow-blue-100'} rounded-t-[18px] relative transition-all duration-700 hover:brightness-110 shadow-lg group-hover:shadow-blue-200`}
                style={{ height: `${heightPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-[18px]" />

                {/* Internal gloss effect */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1/2 h-4 bg-white/10 rounded-full blur-sm" />
              </div>
            </div>

            {/* Label */}
            <div className="text-center mt-4 h-6 flex items-center justify-center px-1">
              <span className={`block text-[10px] font-black transition-all duration-300 truncate w-full tracking-widest uppercase ${hovered === room.room_code ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
                {room.room_code}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};



export default function AssessmentCharts({
  roomStats,
  questionStats,
  aspectStats,
  maxScore,
  minScore = 1,
  scoreDistribution,
}: Props) {

  // Prepare Distribution Data


  // If no data
  if (aspectStats.length === 0 && roomStats.length === 0) {
    return <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</div>
  }

  return (
    <div className="space-y-10 animate-fade-up">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
        {/* L1. ASPECT PERFORMANCE */}
        {aspectStats.length > 0 && (
          <div className="bg-white rounded-[40px] p-8 sm:p-10 border border-blue-50 shadow-xl shadow-blue-50/50 overflow-hidden flex flex-col hover:border-blue-100 transition-colors duration-500">
            <div className="mb-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <RadarIcon size={24} />
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center">
                    ผลการประเมินรายด้าน
                    <ChartTooltip text="คะแนนเฉลี่ยแยกตามด้านต่างๆ ของการประเมิน เพื่อดูจุดแข็งและจุดที่ควรพัฒนา" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ตัวชี้วัดประสิทธิภาพเชิงคุณภาพ</p>
                </div>
              </div>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto pr-3 max-h-[450px] custom-scrollbar">
              {aspectStats.map((aspect, idx) => {
                const val = parseFloat(aspect.average);
                const pct = (val / maxScore) * 100;

                return (
                  <div key={idx} className="group/item">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-bold text-slate-600 text-sm sm:text-base leading-snug max-w-[80%] group-hover/item:text-blue-600 transition-colors">
                        <span className="text-blue-500 mr-3 font-black opacity-30 tracking-tighter">{(idx + 1).toString().padStart(2, '0')}</span>
                        {aspect.text}
                      </h5>
                      <span className="font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-sm border border-blue-100 shadow-sm">
                        {aspect.average}
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100/50">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.2)] transition-all duration-1000 ease-out group-hover/item:brightness-110"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* R1. ASPECT RADAR CHART (Replaces Distribution) */}
        <div className="bg-white rounded-[40px] p-8 sm:p-10 border border-blue-50 shadow-xl shadow-blue-50/50 overflow-hidden flex flex-col justify-center hover:border-blue-100 transition-colors duration-500">
          <div className="mb-6 text-center lg:text-left">
            <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center lg:justify-start">
              จุดแข็ง-จุดอ่อน (รายข้อ)
              <ChartTooltip text="แผนภาพใยแมงมุมแสดงคะแนนเฉลี่ยรายข้อคำถาม เพื่อดูรายละเอียดเจาะลึกในแต่ละประเด็น" />
            </h4>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              Detailed Question Analysis
            </p>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              {questionStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={questionStats.map((q, i) => ({ subject: (i + 1).toString(), fullText: q.text, A: parseFloat(q.average), fullMark: maxScore }))}>
                    <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis domain={[0, maxScore]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="#3B82F6"
                      fillOpacity={0.2}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={false}
                      formatter={(value: any) => [Number(value).toFixed(2), "คะแนน"]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0] && payload[0].payload) {
                          return `${label}. ${payload[0].payload.fullText}`;
                        }
                        return `ข้อที่ ${label}`;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400">
                  <p>ไม่มีข้อมูลรายข้อ</p>
                </div>
              )}
            </div>

            {/* Legend List */}
            {questionStats.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  {questionStats.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm group hover:bg-slate-50 p-2 rounded-lg transition-colors">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-900 transition-colors leading-relaxed">{q.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 2. ROOM AVERAGES COMPARISON - Full Width */}
      <div className="bg-white rounded-[40px] p-8 sm:p-12 border border-blue-50 shadow-xl shadow-blue-50/50 overflow-hidden hover:border-blue-100 transition-colors duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div>
            <h4 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center">
              เปรียบเทียบค่าเฉลี่ยรายห้อง
              <ChartTooltip text="เปรียบเทียบคะแนนเฉลี่ยของการประเมินในแต่ละห้องเรียน" />
            </h4>
            <p className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-widest mt-1 mb-4 sm:mb-0">
              ดัชนีเปรียบเทียบประสิทธิภาพรายห้องเรียน
            </p>
          </div>
          <div className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
            แสดง {roomStats.length} รายการ
          </div>
        </div>

        {roomStats.length > 0 ? (
          <div className="px-0 sm:px-6">
            <RoomBarChart data={roomStats} max={maxScore} />
          </div>
        ) : (
          <div className="text-center py-20 text-slate-300 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
            <RadarIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-xs">ยังไม่มีข้อมูลห้องเรียนสำหรับการเปรียบเทียบ</p>
          </div>
        )}
      </div>

    </div>
  );
}
