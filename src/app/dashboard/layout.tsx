import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/lib/supabase/supabase";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('jupagaba')
  const supabase = getSupabaseClient(token?.value)

  if (!token) {
    redirect("/login");
  }

  // ใช้ RPC: get_current_role_id() ที่แก้ใน SQL แล้ว
  // Return: 1=Admin, 2=Teacher, 3=Student, 4=Executive
  const { data: roleId, error } = await supabase.rpc("get_current_role_id");

  if (error || !roleId) {
    redirect("/login");
  }

  // Check if user is NOT a student (Role ID = 3)
  if (roleId !== 3) {
    if (roleId === 2) {
      redirect("/dashboard-teacher");
    } else if (roleId === 1) {
      redirect("/admin");
    } else if (roleId === 4) {
      redirect("/dashboard-executive");
    }
  }
  return (
    <div className="flex min-h-screen">
      {/* Main Content Area */}
      <div className="flex-1 md:ml-[280px] /* 280px to match sidebar width */ flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
