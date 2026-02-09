"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  Home,
  FileText,
  User,
  Bell,
  LogOut,
  LogIn,
} from "lucide-react";
import Image from "next/image";
import { getSessionToken, logout } from "./action";

// Nav items for Student
const studentNavItems = [
  { label: "แดชบอร์ด", href: "/dashboard", icon: Home },
  {
    label: "ประเมินอาจารย์",
    href: "/dashboard/assessment-advisor",
    icon: FileText,
  },
  { label: "ประวัติการประเมิน", href: "/dashboard/history", icon: Bell },
];

// Nav items for Teacher
const teacherNavItems = [
  { label: "แดชบอร์ด", href: "/dashboard-teacher", icon: Home },
  {
    label: "ห้องเรียนที่ดูแล",
    href: "/dashboard-teacher/advisory-class",
    icon: User,
  },
  {
    label: "สถานะการประเมิน",
    href: "/dashboard-teacher/individual",
    icon: User,
  },
];

export default function Header({
  variant = "default",
  user,
}: {
  variant?: "default" | "admin";
  user?: {
    name: string;
    id: string;
    type: string;
    role: string;
  } | null;
} = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(user || null);
  const pathname = usePathname();

  // Sync prop to state if it changes
  useEffect(() => {
    setUserProfile(user || null);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const handleLogout = async () => {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      await logout(); // Call server action
      alert("ออกจากระบบสำเร็จ");
      window.location.href = "/";
    }
  };

  // If we are on an admin route, do not render this header unless strictly requested
  if (variant !== "admin" && pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <header
        className={`${variant === "default" ? "fixed top-0 left-0 right-0" : "sticky top-0"
          } z-50 transition-all duration-300 font-sans ${isScrolled
            ? "bg-white/80 backdrop-blur-md border-b border-ksu/20 shadow-md py-3"
            : "bg-white/60 backdrop-blur-md border-b border-white/50 py-4 shadow-sm"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 relative flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Image
                src="/logo.png"
                alt="KSU Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-800 leading-tight group-hover:text-ksu transition-colors">
                KSU <span className="text-ksu">Assessment</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">
                Kalasin University
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-50/50 p-1.5 rounded-full border border-white">
            {userProfile?.role === "student" &&
              studentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                      ? "bg-ksu text-white shadow-md"
                      : "text-gray-600 hover:text-ksu hover:bg-white"
                      }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            {userProfile?.role === "teacher" &&
              teacherNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                      ? "bg-ksu text-white shadow-md"
                      : "text-gray-600 hover:text-ksu hover:bg-white"
                      }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          {/* Right Profile & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Desktop Auth Toggle */}
            {userProfile ? (
              <div className="hidden md:flex items-center gap-3 pl-2 pr-1 py-1 rounded-full border border-gray-200 bg-white shadow-sm group">
                <div className="flex flex-col items-end px-2">
                  <span className="text-xs font-black text-gray-800 tracking-tight">
                    {userProfile.name || "Loading..."}
                  </span>
                  <span className="text-[10px] text-ksu font-bold uppercase tracking-wider">
                    {userProfile.type}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 transition-all flex items-center justify-center shadow-xs group/logout"
                  title="ออกจากระบบ"
                >
                  <LogOut
                    size={18}
                    className="transition-transform group-hover/logout:scale-110"
                  />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-ksu text-white rounded-full font-black text-sm shadow-lg shadow-ksu/20 hover:shadow-ksu/40 hover:scale-105 active:scale-95 transition-all"
              >
                <LogIn size={18} />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-ksu/10 hover:text-ksu rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer - only for fixed header */}
      {variant === "default" && <div className="h-24"></div>}

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 right-0 w-[280px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 bg-ksu/5">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-ksu">เมนูหลัก</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Mobile Profile Header */}
              {userProfile ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-ksu flex items-center justify-center shadow-lg shadow-ksu/10">
                    <User className="text-ksu w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-black text-gray-900 leading-tight">
                      {userProfile.name}
                    </div>
                    <div className="text-xs text-ksu font-bold mt-0.5">
                      {userProfile.id} • {userProfile.type}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-4 bg-ksu text-white rounded-2xl shadow-lg shadow-ksu/20"
                >
                  <LogIn size={24} />
                  <span className="font-black text-lg">เข้าสู่ระบบ</span>
                </Link>
              )}
            </div>

            {/* Drawer Links */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {userProfile?.role === "student" &&
                studentNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href
                      ? "bg-ksu text-white shadow-md"
                      : "text-gray-600 hover:bg-ksu/10 hover:text-ksu"
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              {userProfile?.role === "teacher" &&
                teacherNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href
                      ? "bg-ksu text-white shadow-md"
                      : "text-gray-600 hover:bg-ksu/10 hover:text-ksu"
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
            </nav>

            {userProfile && (
              <div className="p-6 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xs"
                >
                  <LogOut size={20} />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
