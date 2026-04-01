"use client";

import { useEffect, useState, useCallback } from "react";
import { listScans, deleteAllScans } from "@/lib/api";
import type { Scan } from "@/lib/types";
import { ScanStatus } from "@/lib/types";
import { NewScanForm } from "@/components/new-scan-form";
import { ScanTable } from "@/components/scan-table";
import { useScanSocket } from "@/hooks/use-scan-socket";
import { Activity, Plus } from "lucide-react";

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingAll, setClearingAll] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Initialize socket for real-time updates
  useScanSocket({
    onProgress: (e) => setScans((prev) => prev.map((s) => s.id === e.scanId ? { ...s, progress: e.progress, phase: e.phase } : s)),
    onComplete: (e) => setScans((prev) => prev.map((s) => s.id === e.scanId ? { ...s, status: ScanStatus.DONE, progress: 100 } : s)),
    onError: (e) => setScans((prev) => prev.map((s) => s.id === e.scanId ? { ...s, status: ScanStatus.FAILED, error: e.message } : s)),
  });

  // Initial fetch
  useEffect(() => {
    async function fetchScans() {
      try {
        const data = await listScans();
        setScans(data);
      } catch (err) {
        console.error("Failed to fetch scans:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchScans();
  }, []);

  const handleScanCreated = useCallback((scan: Scan) => {
    setScans((prev) => [scan, ...prev]);
    setIsDrawerOpen(false);
  }, []);

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all scans? This cannot be undone.")) return;
    setClearingAll(true);
    try {
      await deleteAllScans();
      setScans([]);
    } catch (err) {
      console.error("Failed to clear scans:", err);
    } finally {
      setClearingAll(false);
    }
  };

  // Derived stats
  const activeScans = scans.filter(
    (s) => s.status !== ScanStatus.DONE && s.status !== ScanStatus.FAILED && s.status !== ScanStatus.CANCELLED,
  ).length;
  const totalVulns = scans.reduce((sum, s) => sum + (s.vulns?.length ?? 0), 0);
  const completedScans = scans.filter((s) => s.status === ScanStatus.DONE).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Synchronizing Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100 uppercase">Operational Dashboard</h1>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-1">Real-time vulnerability orchestration</p>
        </div>
        
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-3 rounded-lg bg-emerald-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={3} />
          Initialize Audit
        </button>
      </div>

      {/* ── Metrics Strip ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Live Audit Pipelines" value={activeScans} status="active" />
        <MiniStat label="Threats Defused" value={completedScans} status="secure" />
        <MiniStat label="Security Breaches" value={totalVulns} status="danger" />
        <MiniStat label="System Uptime" value="99.98%" status="stable" />
      </div>

      {/* ── Operational Activity ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Activity size={14} className="text-emerald-500" />
            <h2 className="text-xs font-black tracking-[0.2em] text-zinc-400 uppercase">Audit Log & Stream</h2>
          </div>
          {scans.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-400 transition-colors"
            >
              {clearingAll ? "Purging..." : "System Purge"}
            </button>
          )}
        </div>
        
        <div className="technical-border rounded-xl bg-zinc-950/40 p-1 overflow-hidden">
          <ScanTable scans={scans} onDelete={(id) => setScans((prev) => prev.filter((s) => s.id !== id))} />
        </div>
      </div>

      {/* ── Command Drawer ─────────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative z-[70] h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/5 shadow-2xl animate-in slide-in-from-right duration-500">
            <div className="flex h-16 items-center justify-between border-b border-white/5 px-8">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-100">Initialize Asset Audit</span>
              <button onClick={() => setIsDrawerOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-8">
              <NewScanForm onCreated={handleScanCreated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, status }: { label: string; value: string | number; status: string }) {
  const statusColors = {
    active: "bg-blue-500",
    secure: "bg-emerald-500",
    danger: "bg-red-500",
    stable: "bg-zinc-500",
  };

  return (
    <div className="technical-border rounded-xl bg-zinc-900/10 p-4 transition-all hover:bg-zinc-900/30 group cursor-default">
      <div className="flex items-center gap-3 mb-2">
        <div className={`size-1.5 rounded-full ${statusColors[status as keyof typeof statusColors]} group-hover:animate-pulse`} />
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase">{label}</span>
      </div>
      <div className="text-2xl font-black tracking-tighter text-zinc-100 font-mono">
        {value}
      </div>
    </div>
  );
}
