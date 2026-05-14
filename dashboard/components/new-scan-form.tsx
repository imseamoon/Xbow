"use client";

import { useState } from "react";
import { createScan } from "@/lib/api";
import type { Scan } from "@/lib/types";
import { Crosshair, Layers, FileSearch, ShieldAlert, Rocket } from "lucide-react";
import { motion } from "framer-motion";

interface NewScanFormProps {
  onCreated: (scan: Scan) => void;
}

export function NewScanForm({ onCreated }: NewScanFormProps) {
  const [url, setUrl] = useState("");
  const [singlePage, setSinglePage] = useState(true);
  const [maxPayloads, setMaxPayloads] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const scan = await createScan(url, {
        singlePage,
        depth: singlePage ? 1 : 3,
        maxPayloadsPerParam: maxPayloads,
        reportFormat: ["html", "json", "pdf"],
      });
      setUrl("");
      onCreated(scan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "failed to launch audit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <label htmlFor="url" className="flex items-center gap-2 text-sm font-bold text-slate-800 tracking-tight">
          Target Asset URL
        </label>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-200 to-pink-300 rounded-xl blur opacity-0 group-hover:opacity-50 transition duration-500 group-focus-within:opacity-100"></div>
          <input
            id="url"
            type="url"
            required
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="relative w-full rounded-xl border border-white/60 bg-white/60 backdrop-blur-md px-5 py-4 text-[15px] font-mono text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-pink-300 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
          />
        </div>
      </div>

      {/* ── Scan mode toggle ── */}
      <div className="space-y-4">
        <p className="text-sm font-bold text-slate-800 tracking-tight">Audit Strategy</p>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => setSinglePage(true)}
            className={`group relative flex items-center gap-5 rounded-2xl border p-5 text-left transition-all duration-300 ${
              singlePage
                ? "border-pink-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                : "border-white/50 bg-white/40 hover:bg-white/60 backdrop-blur-md hover:border-white"
            }`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ${singlePage ? "bg-pink-100/50 text-pink-600 scale-110" : "bg-slate-100 text-slate-400 group-hover:scale-105"}`}>
              <FileSearch size={22} />
            </div>
            <div>
              <span className={`block text-[15px] font-bold ${singlePage ? "text-pink-600" : "text-slate-600"}`}>Surface Scan</span>
              <span className="text-sm text-slate-500 mt-0.5 block font-medium">Target URL Only</span>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setSinglePage(false)}
            className={`group relative flex items-center gap-5 rounded-2xl border p-5 text-left transition-all duration-300 ${
              !singlePage
                ? "border-pink-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                : "border-white/50 bg-white/40 hover:bg-white/60 backdrop-blur-md hover:border-white"
            }`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ${!singlePage ? "bg-pink-100/50 text-pink-600 scale-110" : "bg-slate-100 text-slate-400 group-hover:scale-105"}`}>
              <Layers size={22} />
            </div>
            <div>
              <span className={`block text-[15px] font-bold ${!singlePage ? "text-pink-600" : "text-slate-600"}`}>Deep Penetration</span>
              <span className="text-sm text-slate-500 mt-0.5 block font-medium">Full Network Probe</span>
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label
          htmlFor="maxPayloads"
          className="flex items-center justify-between text-sm font-bold text-slate-800 tracking-tight"
        >
          <span>Injection Density</span>
          <span className="text-pink-600 bg-pink-100/50 border border-pink-100 px-3 py-1 rounded-lg text-xs font-black tracking-widest">{maxPayloads} REQ/PARAM</span>
        </label>
        <div className="relative pt-2">
          <input
            id="maxPayloads"
            type="range"
            min={5}
            max={200}
            step={5}
            value={maxPayloads}
            onChange={(e) => setMaxPayloads(Number(e.target.value))}
            className="w-full accent-pink-500 h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer hover:bg-pink-100 transition-colors"
          />
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rounded-xl bg-red-50 p-4 border border-red-100 shadow-sm"
        >
          <p className="text-[13px] font-bold text-red-600 flex items-center gap-2">
            <ShieldAlert size={18} />
            {error}
          </p>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4 text-[15px] font-bold text-white transition-all duration-300 hover:from-rose-400 hover:to-pink-500 hover:shadow-[0_8px_20px_-6px_rgba(236,72,153,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {loading ? (
          <Crosshair size={20} className="animate-spin" />
        ) : (
          <Rocket size={20} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
        )}
        {loading ? "Deploying Assets..." : "Launch Audit"}
      </button>
    </form>
  );
}
