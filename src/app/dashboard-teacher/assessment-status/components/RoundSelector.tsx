"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Calendar } from "lucide-react";
import { parseRoundId, getTermLabel } from "@/lib/utils/round-formatter";

interface Round {
    around_id: string;
}

interface Props {
    rounds: Round[];
    currentRound: string;
}

export default function RoundSelector({ rounds, currentRound }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        params.set("round_id", val);
        // When changing round, we clear room_id to show overview of new round
        params.delete("room_id");
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="relative group min-w-[200px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500 group-hover:text-blue-600 transition-colors z-10">
                <Calendar size={18} className="drop-shadow-sm" />
            </div>
            <select
                value={currentRound}
                onChange={handleChange}
                className="w-full pl-12 pr-10 py-3 bg-white border border-blue-100 rounded-2xl text-sm font-black text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5 relative z-0"
            >
                {rounds.map((r) => {
                    const { year, term } = parseRoundId(r.around_id);
                    return (
                        <option key={r.around_id} value={r.around_id} className="font-bold py-2">
                            ปีการศึกษา {year} | {getTermLabel(term)}
                        </option>
                    );
                })}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors z-10">
                <ChevronDown size={18} />
            </div>

            {/* Label for Dropdown (optional floating style) */}
            <span className="absolute -top-2.5 left-5 bg-white px-2 text-[9px] font-black text-blue-600 uppercase tracking-widest border border-blue-50 rounded-full shadow-sm z-20">
                รอบการประเมิน
            </span>
        </div>
    );
}
