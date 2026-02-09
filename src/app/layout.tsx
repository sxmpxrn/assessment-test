// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";
import HeaderWrapper from "@/app/component/header-wrapper";
import { getSupabaseClient } from "@/lib/supabase/supabase";
import { getSessionToken } from "@/app/component/action"

export const metadata = {
  title: "ระบบประเมินอาจารย์ที่ปรึกษา",
  description: "แผงควบคุมหลัก",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const token = await getSessionToken(); // 1. Await the promise

  // 2. Initialise Supabase Client (pass token string or undefined)
  const supabase = getSupabaseClient(token);

  let headerUser = null;

  // 3. Only fetch user data if authenticated
  if (token) {
    // 3.1 Get Role ID
    const { data, error } = await supabase.rpc("get_current_role_id");
    if (data && !error) {
      const roleId = data as number;

      let userData = null;
      let userRole = "";
      let userTypeLabel = "";

      try {
        if (roleId === 3) {
          // Student
          const { data: student } = await supabase
            .from("students")
            .select("id, student_name, student_id")
            .single();
          if (student) {
            userData = { id: student.student_id, name: student.student_name };
            userRole = "student";
            userTypeLabel = "นักศึกษา";
          }
        } else if (roleId === 2) {
          // Teacher
          const { data: teacher } = await supabase
            .from("teachers")
            .select("id, teacher_name") // Assuming no teacher_id specific display id, using teacher_name
            .single();
          if (teacher) {
            userData = { id: "", name: teacher.teacher_name }; // explicit id empty or internal id? Header uses id for display sometimes
            userRole = "teacher";
            userTypeLabel = "อาจารย์";
          }
        } else if (roleId === 1) {
          // Admin
          const { data: admin } = await supabase
            .from("admins")
            .select("id, admin_name") // Guessing admin_name
            .single();
          if (admin) {
            userData = { id: "ADMIN", name: admin.admin_name || "Admin" };
            userRole = "admin";
            userTypeLabel = "ผู้ดูแลระบบ";
          }
        } else if (roleId === 4) {
          // Executive - check if table exists or just show generic
          const { data: exec } = await supabase
            .from("executives")
            .select("id, executive_name")
            .single();
          if (exec) {
            userData = { id: "EXEC", name: exec.executive_name };
            userRole = "executive";
            userTypeLabel = "ผู้บริหาร";
          }
        }
      } catch (err) {
        console.error("Error fetching user profile for header:", err);
      }

      if (userData) {
        headerUser = {
          id: userData.id || "",
          name: userData.name,
          type: userTypeLabel,
          role: userRole,
        };
      }
    }
  }

  return (
    <html lang="en">
      <body className="bg-linear-to-br from-slate-50 to-slate-100 min-h-screen">
        <HeaderWrapper user={headerUser} />
        <main className="mx-auto">{children}</main>
      </body>
    </html>
  );
}
