"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  Users,
  GraduationCap,
  Menu,
  X,
  LogOut,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  ChevronLeft,
  User,
} from "lucide-react";

/**
 * KSU Admin Sidebar
 * Color Theme: #7ca3d5 (KSU Blue)
 */

const adminNavItems = [
  {
    label: "การจัดการแบบประเมิน",
    icon: GraduationCap,
    href: "#", // Parent item
    children: [
      {
        label: "แดชบอร์ด",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "สร้างแบบประเมิน",
        href: "/admin/assessment-create",
        icon: FileText,
      },
      { label: "จัดการผู้ใช้งาน", href: "/admin/user-setting", icon: Users },
    ],
  },
  {
    label: "ภาพรวมการประเมิน",
    icon: GraduationCap,
    href: "#", // Parent item
    children: [
      {
        label: "มุมมองภาพรวมทั้งหมด",
        href: "/admin/overview",
        icon: LayoutDashboard,
      },
      {
        label: "มุมมองภาพรวมแต่ละคณะ",
        href: "/admin/overview/faculties",
        icon: PieChart,
      },
      {
        label: "มุมมองภาพรวมแต่ละสาขา",
        href: "/admin/overview/majors",
        icon: FileText,
      },
      {
        label: "มุมมองภาพรวมแต่ละบุคคล",
        href: "/admin/overview/individual",
        icon: Users
      },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  toggleSidebar?: () => void;
  user?: {
    name: string;
    id: string;
    type: string;
    role: string;
  } | null;
}

export default function AdminSidebar({
  isCollapsed = false,
  toggleSidebar,
  user,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    การจัดการแบบประเมิน: true, // Default open
  });

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-ksu text-white rounded-xl shadow-lg hover:bg-ksu-dark transition-colors"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 shadow-2xl transform transition-all duration-300 ease-in-out md:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${isCollapsed ? "w-[80px]" : "w-[280px]"}`}
      >
        <div className="h-full flex flex-col bg-white">
          {/* Logo Area */}
          <div
            className={`h-24 flex items-center justify-center border-b border-gray-100 bg-linear-to-b from-white/50 to-white transition-all duration-300 ${isCollapsed ? "px-2" : "px-6"
              }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {/* KSU Logo Placeholder */}
              <div className="w-10 h-10 min-w-[40px] bg-ksu rounded-lg flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={24} />
              </div>
              <div
                className={`flex flex-col transition-opacity duration-200 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"
                  }`}
              >
                <span className="text-xl font-bold text-gray-800 tracking-tight leading-none whitespace-nowrap">
                  KSU <span className="text-ksu">Admin</span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-1 whitespace-nowrap">
                  Management System
                </span>
              </div>
            </div>
          </div>

          {/* Collapse Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`hidden md:flex absolute top-[18px] z-50 w-6 h-6 items-center justify-center bg-white border border-gray-200 rounded-full text-gray-500 hover:text-ksu hover:border-ksu shadow-sm transition-all duration-300 ${isCollapsed ? "left-1/2 -translate-x-1/2 top-20 mt-2" : "right-4"
              }`}
            style={isCollapsed ? { top: "80px", right: "auto" } : {}}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>

          {/* Navigation */}
          <nav
            className={`flex-1 overflow-x-hidden overflow-y-auto py-8 space-y-1.5 custom-scrollbar transition-all duration-300 ${isCollapsed ? "px-2" : "px-4"
              }`}
          >
            <div
              className={`mb-3 transition-opacity duration-200 ${isCollapsed ? "text-center" : "px-4"
                }`}
            >
              {!isCollapsed && (
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Main Menu
                </span>
              )}
              {isCollapsed && (
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                  •••
                </span>
              )}
            </div>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              // Check if any child is active to highlight parent
              const isChildActive = item.children?.some((child) =>
                pathname.startsWith(child.href)
              );
              const isExpanded = expandedMenus[item.label];

              if (item.children) {
                return (
                  <div
                    key={item.label}
                    className="space-y-1 relative group/parent"
                  >
                    <button
                      onClick={() => {
                        if (isCollapsed && toggleSidebar) {
                          toggleSidebar();
                          setTimeout(() => {
                            if (!expandedMenus[item.label]) {
                              toggleMenu(item.label);
                            }
                          }, 300);
                        } else {
                          toggleMenu(item.label);
                        }
                      }}
                      className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-between"
                        } px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isChildActive || isExpanded
                          ? "bg-gray-50 text-ksu"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      title={isCollapsed ? item.label : ""}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          size={20}
                          className={`transition-colors shrink-0 ${isChildActive
                            ? "text-ksu"
                            : "text-gray-400 group-hover:text-gray-600"
                            }`}
                        />
                        {!isCollapsed && (
                          <span className="whitespace-nowrap">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <div className="shrink-0">
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Dropdown Items */}
                    <div
                      className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded && !isCollapsed
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0"
                        }`}
                    >
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href; // Strict for child

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 ml-4 rounded-xl text-sm font-medium transition-all duration-200 border-l-2 ${isChildActive
                              ? "border-ksu bg-ksu/5 text-ksu"
                              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                              }`}
                          >
                            <ChildIcon
                              size={18}
                              className={`shrink-0 ${isChildActive ? "text-ksu" : "text-gray-400"
                                }`}
                            />
                            <span className="whitespace-nowrap">
                              {child.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Standard Item (No Children)
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"
                    } px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive
                      ? "bg-ksu text-white shadow-md shadow-ksu/20"
                      : "text-gray-600 hover:bg-ksu-light hover:text-ksu-dark"
                    }`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon
                    size={20}
                    className={`transition-colors shrink-0 ${isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-ksu"
                      }`}
                  />
                  {!isCollapsed && (
                    <span className="relative z-10 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Logout Section - This matches the server-rendered HTML to fix hydration error */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 transition-all duration-300 px-5">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
              {!isCollapsed && (
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-ksu/10 flex items-center justify-center text-ksu shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-800 truncate">
                      {user?.name || "Admin User"}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">
                      {user?.role || "ผู้ดูแลระบบ"}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={async () => {
                  if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
                    const { logout } = await import("@/app/component/action");
                    await logout();
                    window.location.href = "/";
                  }
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCollapsed
                  ? "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  : "bg-white text-gray-400 hover:bg-red-50 hover:text-red-500 border border-gray-100 shadow-xs"
                  }`}
                title="ออกจากระบบ"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
