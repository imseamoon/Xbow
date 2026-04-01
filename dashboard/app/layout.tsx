import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shield, LayoutDashboard, Activity, Globe, Settings } from "lucide-react";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-emerald-500/30`}>
        <div className="flex min-h-screen bg-[#050505]">
          {/* ── Sidebar ───────────────────────────────────── */}
          <aside className="fixed inset-y-0 left-0 z-50 w-20 flex-col items-center border-r border-white/5 bg-[#0a0a0a] py-8 hidden md:flex">
            <div className="mb-12">
              <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Shield size={22} className="text-white" />
              </div>
            </div>
            
            <nav className="flex flex-col gap-8">
              <SidebarLink icon={<LayoutDashboard size={20} />} active />
              <SidebarLink icon={<Activity size={20} />} />
              <SidebarLink icon={<Globe size={20} />} />
              <SidebarLink icon={<Settings size={20} />} />
            </nav>

            <div className="mt-auto flex flex-col gap-6">
              <div className="size-10 rounded-full border border-white/5 bg-zinc-900/50 flex items-center justify-center hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </aside>

          {/* ── Main Content Area ─────────────────────────── */}
          <main className="flex-1 md:pl-20">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md px-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">RedSentinel / Command Console</span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Node-01 Active</span>
                </div>
              </div>
            </header>

            <div className="p-8 max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function SidebarLink({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <div className={`size-11 rounded-xl flex items-center justify-center transition-all cursor-pointer group ${
      active 
        ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" 
        : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50"
    }`}>
      {icon}
    </div>
  );
}
