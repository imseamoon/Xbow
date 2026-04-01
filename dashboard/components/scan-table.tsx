"use client";

import Link from "next/link";
import type { Scan } from "@/lib/types";
import { ScanStatus } from "@/lib/types";
import { StatusBadge, ProgressBar } from "@/components/ui";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteScan } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScanTable({ scans, onDelete }: { scans: Scan[]; onDelete?: (id: string) => void }) {
  if (scans.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-500">
        No scans yet. Start one above.
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-white/5 bg-[#080808]">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <th className="px-6 py-3">Asset Path</th>
            <th className="px-6 py-3 text-center">Protocol Status</th>
            <th className="px-6 py-3">Audit Stream</th>
            <th className="px-6 py-3 text-center">Threats</th>
            <th className="px-6 py-3 text-right">Timestamp</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {scans.map((scan) => (
            <tr
              key={scan.id}
              className="group transition-all duration-150 hover:bg-emerald-500/[0.02]"
            >
              <td className="px-6 py-4">
                <span className="font-mono text-[11px] font-medium text-zinc-400 group-hover:text-emerald-400 transition-colors">
                  {scan.url}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center">
                  <StatusBadge status={scan.status} />
                </div>
              </td>
              <td className="w-48 px-6 py-4">
                {scan.status !== ScanStatus.DONE &&
                scan.status !== ScanStatus.FAILED &&
                scan.status !== ScanStatus.CANCELLED ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-600">
                      <span>Probing...</span>
                      <span>{Math.round(scan.progress)}%</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        style={{ width: `${scan.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className={`text-[9px] font-black uppercase tracking-widest ${scan.status === ScanStatus.DONE ? "text-emerald-500/60" : "text-zinc-700"}`}>
                    {scan.status === ScanStatus.DONE ? "Audit Sealed" : "Terminated"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-4 rounded text-[9px] font-black tracking-tighter ring-1 transition-all ${
                    (scan.vulns?.length ?? 0) > 0 
                      ? "bg-red-500/10 text-red-500 ring-red-500/30" 
                      : "bg-zinc-900 text-zinc-600 ring-white/5"
                  }`}
                >
                  {scan.vulns?.length ?? 0}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="font-mono text-[10px] text-zinc-600">
                  {formatDate(scan.createdAt).split(",")[1]}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/scan/${scan.id}`}
                    className="text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm("Confirm data erasure?")) return;
                      try {
                        await deleteScan(scan.id);
                        onDelete?.(scan.id);
                      } catch { /* ignore */ }
                    }}
                    className="text-zinc-800 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
