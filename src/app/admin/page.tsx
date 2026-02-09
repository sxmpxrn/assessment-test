"use client";

import { getSupabaseClient } from "@/lib/supabase/supabase";
import { useEffect, useState } from "react";
import { Pencil, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { formatRoundId } from "@/lib/utils/round-formatter";
import { getSessionToken } from "@/app/component/action";

export default function AssessmentDashboard() {
  const [assessmentRounds, setAssessmentRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      const token = await getSessionToken();
      const supabase = getSupabaseClient(token);
      const { data, error } = await supabase
        .from("assessment_detail")
        .select("around_id, start_date, end_date")
        .order("around_id", { ascending: false });

      if (error) {
        console.error("Error fetching assessments:", error);
      } else {
        const uniqueRounds = Array.from(
          new Map(data.map((item) => [item.around_id, item])).values()
        );
        setAssessmentRounds(uniqueRounds);
      }
      setLoading(false);
    };
    fetchAssessments();
  }, []);

  return (
    <div className="p-6 md:p-10 font-sans text-gray-800 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Assessment Dashboard
            </h1>
            <p className="text-gray-500 mt-2">
              รายการรอบการประเมินทั้งหมด ({assessmentRounds.length})
            </p>
          </div>
          <Link
            href="/admin/assessment-create"
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-ksu text-white rounded-xl hover:bg-ksu-dark transition-all shadow-md hover:shadow-lg font-bold text-sm"
          >
            <Plus size={18} />
            สร้างแบบประเมินใหม่
          </Link>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            {assessmentRounds.map((round) => {
              const formatDate = (dateString: string) => {
                if (!dateString) return "";
                const date = new Date(dateString);
                const day = date.getDate().toString().padStart(2, "0");
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const year = (date.getFullYear() + 543).toString();
                return `${day}/${month}/${year}`;
              };

              const getStatus = (endDateString: string) => {
                const now = new Date();
                const end = new Date(endDateString);
                // Set end date to end of day? The user input was YYYY-MM-DD.
                // In DB it might be YYYY-MM-DDT23:59...
                // The current logic is simple comparison.
                const isActive = now <= end;
                return {
                  isActive,
                  label: isActive ? "กำลังดำเนินงาน" : "หมดเวลา",
                  color: isActive
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                };
              };

              const parseAroundId = (id: any) => formatRoundId(id);

              const status = getStatus(round.end_date);

              return (
                <div
                  key={round.around_id}
                  className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-ksu">
                        {parseAroundId(round.around_id)}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="font-medium text-gray-700">
                        ระยะเวลา:
                      </span>
                      {formatDate(round.start_date)} -{" "}
                      {formatDate(round.end_date)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Logic: If not expired -> Edit, If expired -> View */}
                    {status.isActive ? (
                      <Link
                        href={`/admin/assessment-edit/${round.around_id}`}
                        className="p-2 text-gray-400 hover:text-ksu hover:bg-ksu-light rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <Pencil size={18} />
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/assessment-view/${round.around_id}`}
                        className="p-2 text-gray-400 hover:text-ksu hover:bg-ksu-light rounded-lg transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye size={18} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
