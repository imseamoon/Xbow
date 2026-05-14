"use client";

import { ScanStatus, VulnSeverity } from "@/lib/types";

/* ── Status Badge ───────────────────────────────────────────── */

const statusColors: Record<string, string> = {
  [ScanStatus.PENDING]: "text-slate-500 border-slate-200 bg-slate-50",
  [ScanStatus.CRAWLING]: "text-pink-600 border-pink-200 bg-pink-50",
  [ScanStatus.ANALYZING]: "text-violet-600 border-violet-200 bg-violet-50",
  [ScanStatus.GENERATING]: "text-amber-600 border-amber-200 bg-amber-50",
  [ScanStatus.FUZZING]: "text-orange-600 border-orange-200 bg-orange-50",
  [ScanStatus.REPORTING]: "text-cyan-600 border-cyan-200 bg-cyan-50",
  [ScanStatus.DONE]: "text-emerald-600 border-emerald-200 bg-emerald-50",
  [ScanStatus.FAILED]: "text-red-600 border-red-200 bg-red-50",
  [ScanStatus.CANCELLED]: "text-slate-400 border-slate-200 bg-transparent",
};

export function StatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
        statusColors[status] ?? "text-slate-500 border-slate-200 bg-slate-50"
      }`}
    >
      {status}
    </span>
  );
}

/* ── Severity Badge ─────────────────────────────────────────── */

const severityColors: Record<string, string> = {
  [VulnSeverity.CRITICAL]: "bg-red-50 text-red-600 border-red-200",
  [VulnSeverity.HIGH]: "bg-orange-50 text-orange-600 border-orange-200",
  [VulnSeverity.MEDIUM]: "bg-amber-50 text-amber-600 border-amber-200",
  [VulnSeverity.LOW]: "bg-emerald-50 text-emerald-600 border-emerald-200",
  [VulnSeverity.INFO]: "bg-blue-50 text-blue-600 border-blue-200",
};

export function SeverityBadge({ severity }: { severity: VulnSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
        severityColors[severity] ?? "text-slate-500 border-slate-200 bg-slate-50"
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
        <div className="mb-1 flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
        <div
          className={`h-full bg-pink-500 transition-all duration-700 ease-out ${
            active ? "animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.4)]" : ""
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
    <div className={`rounded-xl bg-white border border-slate-200 p-6 shadow-sm ${className}`}>
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
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm group transition-all hover:bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-700 transition-colors">
          {label}
        </span>
        {icon && (
          <div className="text-slate-400 transition-colors group-hover:text-pink-500">
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-black tracking-tight text-slate-900 font-mono">
        {value}
      </div>
    </div>
  );
}
