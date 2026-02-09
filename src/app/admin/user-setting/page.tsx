"use client";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { useEffect, useState } from "react";
import {
  Trash2,
  Edit2,
  Save,
  X,
  Plus,
  Users,
  GraduationCap,
  School,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

type TableName = "students" | "teachers" | "admins" | "role";

const TABLES: { id: TableName; label: string; icon: any }[] = [
  { id: "students", label: "นักเรียน", icon: GraduationCap },
  { id: "teachers", label: "อาจารย์", icon: School },
  { id: "admins", label: "ผู้ดูแลระบบ", icon: ShieldCheck },
];

// Define schemas for adding new rows when table is empty
const COLUMNS_SCHEMA: Record<string, string[]> = {
  students: ["student_id", "student_name", "citizen_id", "role_id", "major_id", "faculty_id", "std_faculty", "room_id"],
  teachers: ["teacher_name", "username", "password", "role_id"],
  admins: ["admin_name", "username", "password", "role_id"],
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function UserSetting() {
  const supabase = getSupabaseClient();
  const [table, setTable] = useState<TableName>("students");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  // Edit Mode State
  const [editingId, setEditingId] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Add Mode State (Modal)
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState<any>({});

  // Fetch data
  useEffect(() => {
    fetchRows();
    // Reset selection when table changes
    setEditingId(null);
    setIsAdding(false);
    setNewRow({});
  }, [table, page, pageSize]);

  // Reset to page 1 when table changes
  useEffect(() => {
    setPage(1);
  }, [table]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      // Calculate range for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .order("id", { ascending: true })
        .range(from, to);

      if (error) throw error;

      setRows(data || []);
      if (count !== null) setTotalRows(count);
    } catch (error) {
      console.error("Error fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const deleteRow = async (id: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบรายการนี้?")) return;
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;

      // Refresh data to keep pagination sync
      fetchRows();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("การลบข้อมูลล้มเหลว");
    }
  };

  const startEdit = (row: any) => {
    setEditingId(row.id);
    setEditFormData({ ...row });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async (id: any) => {
    try {
      // Remove system columns that shouldn't be updated
      // Also remove any null/undefined if necessary, but supabase handles nulls usually
      const { id: _, created_at: __, ...updates } = editFormData;

      console.log("Saving updates for ID:", id, updates);

      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq("id", id)
        .select();

      if (error) throw error;

      setRows(
        rows.map((row) =>
          row.id === id ? (data ? data[0] : { ...row, ...updates }) : row
        )
      );
      setEditingId(null);
    } catch (error) {
      console.error("Error updating:", error);
      alert(
        "การอับเดตข้อมูลล้มเหลว: " +
        (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  };

  const addRow = async () => {
    try {
      // Filter out empty strings to avoid type errors if DB expects null equivalent
      // For now, sending as is.
      const { error } = await supabase.from(table).insert([newRow]);

      if (error) throw error;

      setIsAdding(false);
      setNewRow({});
      fetchRows(); // Refresh to see the new item
    } catch (error) {
      console.error("Error adding:", error);
      alert(
        "การเพิ่มข้อมูลล้มเหลว: " +
        (error instanceof Error ? error.message : String(error))
      );
    }
  };

  // Helper to get columns
  const getColumns = () => {
    if (rows.length > 0) return Object.keys(rows[0]);
    // Use schema if table is empty
    return COLUMNS_SCHEMA[table] || [];
  };

  const columns = getColumns();
  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-800 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              จัดการฐานข้อมูล
            </h1>
            <p className="text-gray-500 mt-1">
              จัดการผู้ใช้ และข้อมูลพื้นฐานของระบบ
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex flex-wrap gap-1">
          {TABLES.map((t) => {
            const Icon = t.icon;
            const isActive = table === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTable(t.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive
                    ? "bg-ksu text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
          {/* Toolbar / Table Header Info */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="capitalize">{table}</span>
              <span className="text-gray-400 text-sm font-normal">
                ({totalRows} total records)
              </span>
            </h2>
            <div className="flex items-center gap-4">
              {/* Page Size Selector */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-ksu focus:border-ksu block p-2"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} ต่อหน้า
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ksu hover:bg-ksu-dark text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Plus size={16} />
                เพิ่มข้อมูล
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto flex-1 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-ksu">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="text-sm font-medium">
                    กำลังโหลดข้อมูล...
                  </span>
                </div>
              </div>
            )}

            {rows.length === 0 && !loading ? (
              <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <div className="bg-gray-50 p-4 rounded-full mb-3">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <p>ไม่พบรายการในตารางนี้</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="text-ksu hover:underline mt-2 text-sm"
                >
                  เพิ่มรายการแรกของคุณ
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-medium">
                    {columns.map((col) => (
                      <th key={col} className="px-6 py-4 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-right sticky right-0 bg-gray-50/50">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {rows.map((row) => {
                    const isEditing = editingId === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`group transition-colors ${isEditing ? "bg-amber-50/50" : "hover:bg-gray-50"
                          }`}
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-6 py-3 whitespace-nowrap align-middle"
                          >
                            {isEditing &&
                              col !== "id" &&
                              col !== "created_at" ? (
                              <input
                                type="text"
                                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-ksu focus:border-ksu block p-1.5 shadow-sm"
                                value={editFormData[col] || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    [col]: e.target.value,
                                  })
                                }
                              />
                            ) : (
                              <span
                                className="text-gray-700 block max-w-[200px] truncate"
                                title={String(row[col])}
                              >
                                {typeof row[col] === "object"
                                  ? JSON.stringify(row[col])
                                  : String(row[col])}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 transition-colors">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => saveEdit(row.id)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Save"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(row)}
                                className="p-1.5 text-ksu hover:text-ksu-dark hover:bg-ksu-light rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => deleteRow(row.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              แสดง{" "}
              <span className="font-medium">
                {rows.length > 0 ? (page - 1) * pageSize + 1 : 0}
              </span>{" "}
              ถึง{" "}
              <span className="font-medium">
                {Math.min(page * pageSize, totalRows)}
              </span>{" "}
              จาก <span className="font-medium">{totalRows}</span> รายการ
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700 px-2">
                หน้า {page} จาก {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">
                เพิ่มรายการใหม่ ({TABLES.find(t => t.id === table)?.label})
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                {columns.length > 0 ? (
                  columns
                    .filter((col) => col !== "id" && col !== "created_at") // Exclude auto fields from adding
                    .map((col) => (
                      <div key={col}>
                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                          {col.replace(/_/g, " ")}
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-ksu focus:border-ksu block p-2.5"
                          placeholder={`ระบุ ${col}...`}
                          value={newRow[col] || ""}
                          onChange={(e) =>
                            setNewRow({ ...newRow, [col]: e.target.value })
                          }
                        />
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">ยังไม่มีเทมเพลตคอลัมน์</p>
                    <p className="text-xs">
                      ไม่สามารถระบุฟิลด์ข้อมูลได้เนื่องจากไม่มีข้อมูลโครงสร้างตาราง
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={addRow}
                disabled={columns.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-ksu rounded-lg hover:bg-ksu-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                สร้างรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
