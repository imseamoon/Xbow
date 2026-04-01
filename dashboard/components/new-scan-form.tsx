"use client";

import { useState } from "react";
import { createScan } from "@/lib/api";
import type { Scan } from "@/lib/types";
import { Crosshair, Layers, FileSearch } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="url" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Target Environment URL
        </label>
        <div className="relative group">
          <input
            id="url"
            type="url"
            required
            placeholder="https://example-environment.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border border-white/5 bg-zinc-800/20 px-4 py-3 text-xs text-zinc-100 placeholder-zinc-700 outline-none transition-all focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 hover:border-white/10"
          />
        </div>
      </div>

      {/* ── Scan mode toggle ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audit Protocol</p>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => setSinglePage(true)}
            className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              singlePage
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                : "border-white/5 bg-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.02]"
            }`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-all ${singlePage ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30" : "bg-zinc-800/50 text-zinc-600 ring-white/5"}`}>
              <FileSearch size={16} />
            </div>
            <div>
              <span className={`block text-xs font-black tracking-tight ${singlePage ? "text-zinc-100" : "text-zinc-400"}`}>Point Scan</span>
              <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Target URL Only</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSinglePage(false)}
            className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              !singlePage
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                : "border-white/5 bg-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.02]"
            }`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-all ${!singlePage ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30" : "bg-zinc-800/50 text-zinc-600 ring-white/5"}`}>
              <Layers size={16} />
            </div>
            <div>
              <span className={`block text-xs font-black tracking-tight ${!singlePage ? "text-zinc-100" : "text-zinc-400"}`}>Recursive Crawl</span>
              <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Deep Network Probe</span>
            </div>
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="maxPayloads"
          className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500"
        >
          Payload Density
        </label>
        <input
          id="maxPayloads"
          type="number"
          min={5}
          max={200}
          value={maxPayloads}
          onChange={(e) => setMaxPayloads(Number(e.target.value))}
          className="w-full rounded-xl border border-white/5 bg-zinc-800/20 px-4 py-3 text-xs text-zinc-100 outline-none transition-all focus:border-emerald-500/30 hover:border-white/10"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 ring-1 ring-red-500/20 italic">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-emerald-600 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] disabled:opacity-50 active:scale-[0.98]"
      >
        <Crosshair size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Engaging..." : "Initialize Audit"}
      </button>
    </form>
  );
}
