"use client";

import Link from "next/link";
import type { Scan } from "@/lib/types";
import { ScanStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteScan } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="py-24 flex flex-col items-center justify-center text-slate-500">
        <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-200">
          <div className="size-8 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-600">System Idle</p>
        <p className="text-xs text-slate-400 mt-1">Initialize an audit to begin monitoring</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
            <th className="px-6 py-4">Target</th>
            <th className="px-6 py-4 text-center">Status</th>
            <th className="px-6 py-4">Progress</th>
            <th className="px-6 py-4 text-center">Threats</th>
            <th className="px-6 py-4 text-right">Timestamp</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 relative bg-white">
          <AnimatePresence initial={false}>
            {scans.map((scan) => (
              <motion.tr
                layout
                initial={{ opacity: 0, y: -10, backgroundColor: "rgba(236, 72, 153, 0.05)" }}
                animate={{ opacity: 1, y: 0, backgroundColor: "rgba(255, 255, 255, 1)" }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3 }}
                key={scan.id}
                className="group hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-pink-600 uppercase">{new URL(scan.url).hostname.substring(0,2)}</span>
                    </div>
                    <span className="font-mono text-sm text-slate-700 truncate max-w-[200px] lg:max-w-[300px]">
                      {scan.url}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <StatusBadge status={scan.status} />
                  </div>
                </td>
                <td className="w-64 px-6 py-4">
                  {scan.status !== ScanStatus.DONE &&
                  scan.status !== ScanStatus.FAILED &&
                  scan.status !== ScanStatus.CANCELLED ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-pink-500 animate-pulse" />
                          {scan.phase || "Probing"}
                        </span>
                        <span className="text-pink-600">{Math.round(scan.progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${scan.progress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full bg-pink-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className={`text-xs font-medium flex items-center gap-2 ${scan.status === ScanStatus.DONE ? "text-emerald-600" : "text-slate-500"}`}>
                      {scan.status === ScanStatus.DONE ? (
                        <><span className="size-1.5 rounded-full bg-emerald-500" /> Complete</>
                      ) : (
                        <><span className="size-1.5 rounded-full bg-slate-400" /> Terminated</>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <motion.span
                    key={scan.vulns?.length ?? 0}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      (scan.vulns?.length ?? 0) > 0 
                        ? "bg-red-50 text-red-600" 
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {scan.vulns?.length ?? 0}
                  </motion.span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono text-xs text-slate-500">
                    {formatDate(scan.createdAt).split(",")[1]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/scan/${scan.id}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm("Are you sure you want to delete this scan?")) return;
                        try {
                          await deleteScan(scan.id);
                          onDelete?.(scan.id);
                        } catch { /* ignore */ }
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
