import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shield, LayoutDashboard, Activity, Globe, Settings, Crosshair } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RedSentinel Console",
  description: "AI-Augmented XSS Vulnerability Orchestrator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-pink-200 font-sans text-slate-900`}>
        <div className="flex min-h-screen bg-[#FDFCFD]">
          {/* ── Sidebar ───────────────────────────────────── */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-slate-200 bg-white hidden md:flex">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-sm">
                  <Shield size={18} className="text-white" />
                </div>
                <span className="font-bold text-slate-800 tracking-wide">RedSentinel</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-4">
              <div className="text-xs font-semibold text-slate-400 mb-4 px-2 uppercase tracking-widest">Menu</div>
              <nav className="flex flex-col gap-2">
                <SidebarLink icon={<LayoutDashboard size={18} />} label="Dashboard" active />
                <SidebarLink icon={<Crosshair size={18} />} label="Targets" />
                <SidebarLink icon={<Activity size={18} />} label="Activity" />
                <SidebarLink icon={<Globe size={18} />} label="Network" />
              </nav>
            </div>

            <div className="p-4 border-t border-slate-100">
              <SidebarLink icon={<Settings size={18} />} label="Settings" />
            </div>
          </aside>

          {/* ── Main Content Area ─────────────────────────── */}
          <main className="flex-1 md:pl-64 flex flex-col min-h-screen">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-[#FDFCFD]/80 backdrop-blur-md px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">Dashboard</span>
                  <span className="text-sm text-slate-400">/</span>
                  <span className="text-sm text-slate-500">Overview</span>
                </div>
              </div>
            </header>

            <div className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`w-full rounded-lg flex items-center gap-3 px-3 py-2.5 transition-all duration-200 cursor-pointer ${active
        ? "bg-pink-50 text-pink-600 font-medium shadow-sm border border-pink-100"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium border border-transparent"
      }`}>
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}
