import {
    PieChart,
    ArrowLeft,
    Users,
    Star,
    BarChart3,
    Building2,
} from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#f8fbff] font-sans pb-20">
            {/* 1. Header & Navigation Skeleton */}
            <header className="bg-white border-b border-blue-50 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-xl text-blue-200">
                                <ArrowLeft size={24} />
                            </div>
                            <div>
                                <div className="h-8 w-48 bg-slate-100 rounded-lg mb-1 animate-pulse" />
                                <div className="h-3 w-32 bg-slate-50 rounded-lg animate-pulse" />
                            </div>
                        </div>

                        <div className="w-48 sm:w-56 h-12 bg-slate-100 rounded-2xl animate-pulse" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
                {/* Loading Message */}
                <div className="flex items-center gap-3 text-blue-600 animate-pulse bg-blue-50/50 self-start px-4 py-2 rounded-full border border-blue-100/50 w-fit">
                    <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Assessment Intelligence...</span>
                </div>

                {/* 2. Overview Overview (Snapshot) Skeleton */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Progress (Large) */}
                    <div className="lg:col-span-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[260px] animate-pulse">
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="h-4 w-32 bg-white/20 rounded-lg mb-4" />
                                <div className="h-12 w-64 bg-white/30 rounded-2xl" />
                            </div>
                            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md">
                                <Users size={32} />
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="h-20 w-56 bg-white/30 rounded-3xl mb-6 shadow-2xl shadow-blue-900/20" />
                            <div className="w-full bg-blue-900/20 h-4 rounded-full p-1 border border-white/5">
                                <div className="h-full bg-white/40 w-1/3 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Global Average (Small) */}
                    <div className="lg:col-span-4 bg-white rounded-[32px] p-8 shadow-xl shadow-blue-50/50 border border-blue-50 flex flex-col items-center justify-center text-center relative overflow-hidden animate-pulse">
                        <div className="w-16 h-16 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-200 mb-6 rotate-6 transform transition-transform duration-500">
                            <Star size={40} fill="currentColor" strokeWidth={1} />
                        </div>
                        <div className="h-16 w-32 bg-slate-100 rounded-[24px] mb-4" />
                        <div className="h-4 w-40 bg-slate-50 rounded-lg" />
                    </div>
                </section>

                {/* 3. Classroom Status Grid Skeleton */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white text-blue-100 rounded-2xl border border-blue-50 shadow-sm"><Building2 size={24} /></div>
                        <div className="h-8 w-64 bg-slate-100 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-7 rounded-[30px] border border-slate-100 shadow-sm animate-pulse flex flex-col gap-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-3">
                                        <div className="h-3 w-12 bg-slate-50 rounded" />
                                        <div className="h-10 w-24 bg-slate-100 rounded-xl" />
                                    </div>
                                    <div className="w-14 h-7 bg-slate-50 rounded-xl" />
                                </div>
                                <div className="space-y-3 mt-4">
                                    <div className="flex justify-between">
                                        <div className="h-2 w-16 bg-slate-50 rounded-full" />
                                        <div className="h-2 w-10 bg-slate-50 rounded-full" />
                                    </div>
                                    <div className="h-3 w-full bg-slate-50 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
