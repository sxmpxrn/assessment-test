import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Globe2,
  BookOpen,
} from "lucide-react";
import Image from "next/image";

export default function LandingPage() {

  return (
    <div className="min-h-screen font-sans selection:bg-ksu/20 selection:text-ksu-dark">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-linear-to-br from-ksu/20 to-sky-300/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div
          className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-linear-to-tr from-emerald-400/20 to-teal-200/20 rounded-full blur-3xl -z-10"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200/50 px-4 py-1.5 rounded-full text-sm font-bold text-ksu shadow-lg shadow-ksu/5 mb-8 animate-fade-up">
            <span className="flex h-2 w-2 rounded-full bg-ksu animate-ping"></span>
            ระบบประเมินผลการเรียนการสอนรูปแบบใหม่
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight animate-fade-up delay-100">
            ยกระดับคุณภาพการศึกษา <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-ksu to-ksu-dark drop-shadow-sm">
              มหาวิทยาลัยกาฬสินธุ์
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-10 leading-relaxed animate-fade-up delay-200">
            แพลตฟอร์มบริหารจัดการและประเมินผลการเรียนการสอน
            ที่ออกแบบมาเพื่อความสะดวก รวดเร็ว และแม่นยำ สำหรับอาจารย์ นักศึกษา
            และบุคลากร
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-105 transition-all text-center flex items-center justify-center gap-3"
            >
              เริ่มต้นใช้งาน
              <ArrowRight size={20} />
            </Link>
            <a
              href="#about"
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg shadow-xl shadow-slate-200/50 hover:bg-slate-50 hover:border-slate-300 transition-all text-center"
            >
              เกี่ยวกับมหาวิทยาลัย
            </a>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">
              จุดเด่นของระบบ
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              เทคโนโลยีที่ช่วยขับเคลื่อนการศึกษาให้มีประสิทธิภาพ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CheckCircle2 size={32} />}
              title="ประเมินผลออนไลน์"
              description="ลดการใช้กระดาษ สะดวก รวดเร็ว ทำได้ทุกที่ทุกเวลา ผ่านอุปกรณ์ของคุณ"
              color="bg-emerald-50 text-emerald-600"
            />
            <FeatureCard
              icon={<BarChart3 size={32} />}
              title="วิเคราะห์ข้อมูลเรียลไทม์"
              description="ผู้สอนและผู้บริหารสามารถดูผลการประเมินและสถิติได้ทันที เพื่อนำไปปรับปรุงการสอน"
              color="bg-blue-50 text-blue-600"
            />
            <FeatureCard
              icon={<ShieldCheck size={32} />}
              title="ปลอดภัยและเป็นส่วนตัว"
              description="ระบบรักษาความปลอดภัยข้อมูลขั้นสูง มั่นใจได้ว่าข้อมูลการประเมินจะถูกเก็บเป็นความลับ"
              color="bg-purple-50 text-purple-600"
            />
          </div>
        </div>
      </section>

      {/* University Section */}
      <section
        id="about"
        className="py-24 bg-slate-900 text-white relative overflow-hidden"
      >
        {/* Decorative BG */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-block p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                <Globe2 size={32} className="text-ksu-light" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                มหาวิทยาลัยกาฬสินธุ์ <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-ksu via-emerald-400 to-teal-200">
                  Kalasin University
                </span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                มุ่งมั่นผลิตบัณฑิตที่มีความรู้คู่คุณธรรม นำภูมิปัญญาพัฒนาสังคม
                ด้วยหลักสูตรที่ทันสมัยและการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ
                เพื่อสร้างสรรค์นวัตกรรมและองค์ความรู้เพื่อการพัฒนาที่ยั่งยืน
              </p>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-white">20+</h3>
                  <p className="text-slate-400 text-sm">คณะและวิทยาลัย</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-white">5000+</h3>
                  <p className="text-slate-400 text-sm">นักศึกษาปัจจุบัน</p>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="https://www.ksu.ac.th"
                  target="_blank"
                  className="inline-flex items-center gap-2 text-ksu hover:text-white transition-colors font-bold"
                >
                  เข้าสู่เว็บไซต์หลักมหาวิทยาลัย <ArrowRight size={18} />
                </a>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                {/* Placeholder for University Image - Used colors to simulate generic image */}
                <div className="absolute inset-0 bg-linear-to-br from-slate-800 to-slate-900 group-hover:scale-105 transition-transform duration-700"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <BookOpen
                      size={64}
                      className="mx-auto text-white/20 mb-4"
                    />
                    <p className="text-white/40 font-bold text-xl uppercase tracking-widest">
                      KSU Campus
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Card */}
              <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl max-w-xs hidden md:block">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-ksu/10 flex items-center justify-center text-ksu">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      Wisdom with Virtue
                    </p>
                    <p className="text-xs text-slate-500">KSU Philosophy</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  "ความรู้คู่คุณธรรม"
                  ปรัชญาที่เป็นหัวใจสำคัญของการพัฒนานักศึกษาของเรา
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-slate-500" size={18} />
            </div>
            <p className="text-slate-500 font-semibold text-sm">
              &copy; {new Date().getFullYear()} Kalasin University. All rights
              reserved.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-slate-400 font-medium">
            <a href="#" className="hover:text-ksu transition-colors">
              นโยบายความเป็นส่วนตัว
            </a>
            <a href="#" className="hover:text-ksu transition-colors">
              เงื่อนไขการใช้งาน
            </a>
            <a href="#" className="hover:text-ksu transition-colors">
              ติดต่อเรา
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: any) {
  return (
    <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 hover:bg-white hover:border-ksu/20 hover:shadow-2xl hover:shadow-ksu/10 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-transparent to-ksu/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${color} transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed font-medium group-hover:text-slate-600">
        {description}
      </p>
    </div>
  );
}
