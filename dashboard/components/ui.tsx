"use client";

import { ScanStatus, VulnSeverity } from "@/lib/types";

/* ── Status Badge ───────────────────────────────────────────── */

const statusColors: Record<string, string> = {
  [ScanStatus.PENDING]: "text-zinc-500 border-zinc-800 bg-zinc-900/10",
  [ScanStatus.CRAWLING]: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  [ScanStatus.ANALYZING]: "text-violet-400 border-violet-500/20 bg-violet-500/5",
  [ScanStatus.GENERATING]: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  [ScanStatus.FUZZING]: "text-orange-400 border-orange-500/20 bg-orange-500/5",
  [ScanStatus.REPORTING]: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
  [ScanStatus.DONE]: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  [ScanStatus.FAILED]: "text-red-400 border-red-500/20 bg-red-500/5",
  [ScanStatus.CANCELLED]: "text-zinc-600 border-zinc-900 bg-transparent",
};

export function StatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
        statusColors[status] ?? "text-zinc-500 border-zinc-800"
      }`}
    >
      {status}
    </span>
  );
}

/* ── Severity Badge ─────────────────────────────────────────── */

const severityColors: Record<string, string> = {
  [VulnSeverity.CRITICAL]: "bg-red-500/20 text-red-400 border-red-500/30",
  [VulnSeverity.HIGH]: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  [VulnSeverity.MEDIUM]: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  [VulnSeverity.LOW]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  [VulnSeverity.INFO]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function SeverityBadge({ severity }: { severity: VulnSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
        severityColors[severity] ?? "text-zinc-500 border-zinc-800"
      }`}
    >
      {severity}
    </span>
  );
}

/* ── Progress Bar ───────────────────────────────────────────── */

export function ProgressBar({
  value,
  label,
  active = false,
}: {
  value: number;
  label?: string;
  active?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/5">
        <div
          className={`h-full bg-emerald-500 transition-all duration-700 ease-out ${
            active ? "animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" : ""
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`technical-border bg-zinc-950/20 p-6 ${className}`}>
      {children}
    </div>
  );
}

/* ── Stat Card (Legacy Compatibility) ────────────────────────── */

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="technical-border bg-zinc-900/20 p-5 group transition-all hover:bg-zinc-900/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">
          {label}
        </span>
        {icon && (
          <div className="text-zinc-700 transition-colors group-hover:text-emerald-500">
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-black tracking-tight text-zinc-100 font-mono">
        {value}
      </div>
    </div>
  );
}
