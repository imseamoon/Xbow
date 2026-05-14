"use client";

import type { Vuln } from "@/lib/types";
import { VulnType } from "@/lib/types";
import { SeverityBadge } from "@/components/ui";

const isDomXss = (v: Vuln) =>
  v.type === VulnType.DOM_XSS || 
  v.type === VulnType.OPEN_REDIRECT ||
  v.type === VulnType.MUTATION_XSS ||
  v.type === VulnType.SVG_XSS;

export function VulnList({ vulns }: { vulns: Vuln[] }) {
  if (vulns.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No vulnerabilities found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vulns.map((v, i) => {
        const domXss = isDomXss(v);
        const ev = v.evidence;
        return (
          <div
            key={v.id ?? i}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            {/* ── header row ── */}
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <SeverityBadge severity={v.severity} />
              <span className="text-sm font-medium text-slate-800">
                {v.type.replace(/_/g, " ")}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {domXss ? "source" : "param"}:{" "}
                <code className="text-slate-600">{v.param}</code>
              </span>
            </div>

            {/* ── page URL ── */}
            <div className="mb-2 truncate text-xs text-slate-500">
              <span className="mr-1 text-slate-400">page:</span>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {v.url}
              </a>
            </div>

            {/* ── payload / finding ── */}
            <div className="mb-2 overflow-x-auto rounded bg-slate-50 border border-slate-100 p-2">
              <code className="whitespace-pre text-xs text-slate-800 font-medium">
                {v.payload}
              </code>
            </div>

            {/* ── DOM XSS details ── */}
            {domXss && (ev.sink || ev.snippet) && (
              <div className="mb-2 space-y-1 rounded bg-slate-50 border border-slate-100 p-2 text-xs">
                {ev.sink && (
                  <div>
                    <span className="text-slate-500">sink: </span>
                    <code className="text-red-600">{ev.sink}</code>
                    {ev.line && (
                      <span className="ml-2 text-slate-400">line {ev.line}</span>
                    )}
                  </div>
                )}
                {ev.source && (
                  <div>
                    <span className="text-slate-500">source: </span>
                    <code className="text-orange-600">{ev.source}</code>
                  </div>
                )}
                {ev.snippet && (
                  <div className="mt-1 overflow-x-auto">
                    <span className="text-slate-500">snippet: </span>
                    <code className="text-slate-600">{ev.snippet}</code>
                  </div>
                )}
                {ev.scriptUrl && ev.scriptUrl !== v.url && (
                  <div className="truncate">
                    <span className="text-slate-500">script: </span>
                    <span className="text-slate-600">{ev.scriptUrl}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── flags row ── */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>
                Reflected:{" "}
                <span className={v.reflected ? "text-emerald-600" : "text-slate-400"}>
                  {v.reflected ? "yes" : "no"}
                </span>
              </span>
              <span>
                Executed:{" "}
                <span className={v.executed ? "text-red-600" : "text-slate-400"}>
                  {v.executed ? "yes" : "no"}
                </span>
              </span>
              {!domXss && (
                <span>
                  Position:{" "}
                  <span className="text-slate-600">{ev.reflectionPosition}</span>
                </span>
              )}
              <span>
                HTTP{" "}
                <span className="text-slate-600">{ev.responseCode}</span>
              </span>
              {ev.browserAlertTriggered && (
                <span className="text-red-600 font-medium">⚡ alert triggered</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
