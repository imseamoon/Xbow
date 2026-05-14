"use client";

import { useState } from "react";
import { createScan } from "@/lib/api";
import type { Scan } from "@/lib/types";
import { Crosshair, Layers, FileSearch, ShieldAlert } from "lucide-react";
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
      setError(err instanceof Error ? err.message : "failed to create scan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="url" className="flex items-center gap-2 text-sm font-medium text-slate-300">
          Target URL
        </label>
        <div className="relative group">
          <input
            id="url"
            type="url"
            required
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#0A0A0B] px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-white/20"
          />
        </div>
      </div>

      {/* ── Scan mode toggle ── */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-300">Scan Strategy</p>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => setSinglePage(true)}
            className={`relative flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
              singlePage
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/5 bg-[#0A0A0B] hover:border-white/10"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors ${singlePage ? "bg-blue-500/20 text-blue-400" : "bg-slate-900 text-slate-500"}`}>
              <FileSearch size={18} />
            </div>
            <div>
              <span className={`block text-sm font-medium ${singlePage ? "text-blue-100" : "text-slate-300"}`}>Point Scan</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Target URL Only</span>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setSinglePage(false)}
            className={`relative flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
              !singlePage
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/5 bg-[#0A0A0B] hover:border-white/10"
            }`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors ${!singlePage ? "bg-blue-500/20 text-blue-400" : "bg-slate-900 text-slate-500"}`}>
              <Layers size={18} />
            </div>
            <div>
              <span className={`block text-sm font-medium ${!singlePage ? "text-blue-100" : "text-slate-300"}`}>Recursive Crawl</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Full Network Probe</span>
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label
          htmlFor="maxPayloads"
          className="flex items-center justify-between text-sm font-medium text-slate-300"
        >
          <span>Payload Density</span>
          <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-xs">{maxPayloads} req/param</span>
        </label>
        <input
          id="maxPayloads"
          type="range"
          min={5}
          max={200}
          step={5}
          value={maxPayloads}
          onChange={(e) => setMaxPayloads(Number(e.target.value))}
          className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md bg-red-500/10 p-3 border border-red-500/20"
        >
          <p className="text-sm font-medium text-red-400 flex items-center gap-2">
            <ShieldAlert size={16} />
            {error}
          </p>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Crosshair size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Engaging Protocol..." : "Create Scan"}
      </button>
    </form>
  );
}
