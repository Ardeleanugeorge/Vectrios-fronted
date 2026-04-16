"use client";
import { apiFetch } from "@/lib/api"

import { API_URL, PUBLIC_HOME_URL } from '@/lib/config'

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CompanyRow {
  rank: number;
  domain: string;
  rii: number | null;
  alignment: number | null;
  icp_clarity: number | null;
  anchor_density: number | null;
  positioning: number | null;
  confidence: number | null;
  risk_level: string | null;
  inferred_icp: string | null;
  pages_scanned: number | null;
  scanned_at: string | null;
}

interface IndexStats {
  total_companies: number;
  average_rii: number | null;
  high_exposure: number;
  moderate_exposure: number;
  low_exposure: number;
}

interface IndexData {
  stats: IndexStats;
  companies: CompanyRow[];
  top10: CompanyRow[];
  worst10: CompanyRow[];
}

function getRiskColor(risk: string | null) {
  if (!risk) return { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-500" };
  const r = risk.toLowerCase();
  if (r.includes("high"))     return { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-500" };
  if (r.includes("moderate")) return { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-500" };
  return                             { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-500" };
}

function RiiBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600">—</span>;
  const pct = Math.min(value, 100);
  const color =
    value >= 70 ? "from-red-500 to-orange-500" :
    value >= 40 ? "from-yellow-500 to-amber-500" :
                  "from-green-500 to-cyan-500";
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-right font-mono text-sm font-semibold text-white">
        {Math.round(value)}
      </span>
      <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-700">—</span>;
  const color =
    value >= 65 ? "text-green-400" :
    value >= 40 ? "text-yellow-400" :
                  "text-red-400";
  return <span className={`font-mono text-sm ${color}`}>{Math.round(value)}</span>;
}

export default function SaaSRevenueIndex() {
  const router = useRouter();
  const [data, setData]       = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "high" | "moderate" | "low">("all");
  const [search, setSearch]   = useState("");

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/scan-results");
  };

  useEffect(() => {
    apiFetch(`/saas-revenue-index`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        console.error("[SAAS-INDEX] Fetch error:", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const companies = data?.companies ?? [];
  const filtered = companies.filter(c => {
    const matchFilter =
      filter === "all" ? true :
      filter === "high"     ? (c.rii ?? 0) >= 70 :
      filter === "moderate" ? (c.rii ?? 0) >= 40 && (c.rii ?? 0) < 70 :
                              (c.rii ?? 0) < 40;
    const matchSearch =
      search === "" ? true :
      c.domain.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const s = data?.stats;

  return (
    <div className="page-root font-sans">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href={PUBLIC_HOME_URL} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-sm font-semibold text-white tracking-wide">
            Vectri<span className="text-cyan-400">OS</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
          <Link
            href={PUBLIC_HOME_URL}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Run your own scan
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            SaaS Revenue Architecture Index
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-2">
            Most SaaS companies are losing $120K–$300K/year from messaging gaps they don&apos;t see.
          </p>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            This index shows how clearly each company&apos;s story supports revenue — so you can see where you stand.
          </p>
        </div>

        {/* Stats bar */}
        {s && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: "Companies Analyzed", value: s.total_companies, color: "text-white" },
                { label: "Average RII (lower = better)", value: s.average_rii !== null ? s.average_rii.toFixed(1) : "—", color: "text-yellow-400" },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/5 p-5 text-center">
                  <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-10 max-w-3xl mx-auto text-center">
              Companies in this dataset quietly lose an estimated
              <span className="text-amber-300 font-semibold"> $8K–$25K/month</span>{" "}
              from messaging gaps that never show up in dashboards.
              Use this benchmark to understand how risky your own revenue architecture might be — then run your scan to see your exact exposure.
            </p>
          </>
        )}

        {/* -- Top 10 / Worst 10 -- */}
        {data && (data.top10.length > 0 || data.worst10.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">

            {/* Top 10 — best architecture */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-500/20 flex items-center gap-2">
                <span className="text-emerald-400 text-sm font-semibold">Best revenue architecture</span>
                <span className="ml-auto text-xs text-gray-600">lowest RII</span>
              </div>
              <div>
                {data.top10.map((c, i) => (
                  <div key={c.domain} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs text-gray-600 font-mono w-4">{i + 1}</span>
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${c.domain.replace(/^https?:\/\//, '').split('/')[0]}.ico`}
                      alt=""
                      className="w-4 h-4 rounded opacity-60"
                      onError={e => {
                        const img = e.currentTarget as HTMLImageElement;
                        const host = c.domain.replace(/^https?:\/\//, '').split('/')[0];
                        // Try direct site favicon once, then hide
                        img.onerror = null; // prevent recursive handler reuse
                        img.src = `https://${host}/favicon.ico`;
                        img.addEventListener("error", () => {
                          img.style.display = "none";
                        }, { once: true });
                      }}
                    />
                    <Link href={`/company/${c.domain}`}
                       className="text-sm text-white hover:text-emerald-300 transition-colors flex-1 truncate">
                      {c.domain}
                    </Link>
                    <span className="text-emerald-400 font-mono text-sm font-bold">
                      {c.rii !== null ? Math.round(c.rii) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst 10 — highest exposure */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
              <div className="px-5 py-4 border-b border-red-500/20 flex items-center gap-2">
                <span className="text-red-400 text-sm font-semibold">Highest revenue exposure</span>
                <span className="ml-auto text-xs text-gray-600">highest RII</span>
              </div>
              <div>
                {data.worst10.map((c, i) => (
                  <div key={c.domain} className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs text-gray-600 font-mono w-4">{i + 1}</span>
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${c.domain.replace(/^https?:\/\//, '').split('/')[0]}.ico`}
                      alt=""
                      className="w-4 h-4 rounded opacity-60"
                      onError={e => {
                        const img = e.currentTarget as HTMLImageElement;
                        const host = c.domain.replace(/^https?:\/\//, '').split('/')[0];
                        img.onerror = null;
                        img.src = `https://${host}/favicon.ico`;
                        img.addEventListener("error", () => {
                          img.style.display = "none";
                        }, { once: true });
                      }}
                    />
                    <Link href={`/company/${c.domain}`}
                       className="text-sm text-white hover:text-red-300 transition-colors flex-1 truncate">
                      {c.domain}
                    </Link>
                    <span className="text-red-400 font-mono text-sm font-bold">
                      {c.rii !== null ? Math.round(c.rii) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs text-gray-600 uppercase tracking-widest">Full Index</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2">
            {(["all", "low", "moderate", "high"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filter === f
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                {f === "all" ? "All Companies" :
                 f === "low" ? "Low exposure" :
                 f === "moderate" ? "Moderate" :
                 "High exposure"}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search domain..."
            className="sm:ml-auto bg-white/[0.03] border border-white/10 rounded-lg px-4 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 w-full sm:w-56"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2.5rem_1fr_7rem_5rem_5rem_5rem_5rem_6rem] gap-2 px-5 py-3 bg-white/[0.02] border-b border-white/5 text-xs text-gray-500 font-medium uppercase tracking-widest">
            <span>#</span>
            <span>Company</span>
            <span className="text-center">RII Score</span>
            <span className="text-center">Align</span>
            <span className="text-center">ICP</span>
            <span className="text-center">Anchor</span>
            <span className="text-center">Pos.</span>
            <span className="text-center">Status</span>
          </div>

          {loading && (
            <div className="py-20 text-center text-gray-600 text-sm">
              <div className="w-5 h-5 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
              Loading index...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-gray-600 text-sm">No companies scanned yet.</p>
              <Link href={PUBLIC_HOME_URL} className="mt-3 inline-block text-cyan-400 text-sm hover:underline">
                Run the first scan
              </Link>
            </div>
          )}

          {!loading && filtered.map((c, i) => {
            const risk = getRiskColor(c.risk_level);
            return (
              <div
                key={c.domain}
                className="grid grid-cols-[2.5rem_1fr_7rem_5rem_5rem_5rem_5rem_6rem] gap-2 items-center px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
              >
                {/* Rank */}
                <span className="text-xs text-gray-600 font-mono">{i + 1}</span>

                {/* Domain */}
                <div>
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${c.domain.replace(/^https?:\/\//, '').split('/')[0]}.ico`}
                      alt=""
                      className="w-4 h-4 rounded opacity-70"
                      onError={e => {
                        const img = e.currentTarget as HTMLImageElement;
                        const host = c.domain.replace(/^https?:\/\//, '').split('/')[0];
                        img.onerror = null;
                        img.src = `https://${host}/favicon.ico`;
                        img.addEventListener("error", () => {
                          img.style.display = "none";
                        }, { once: true });
                      }}
                    />
                    <Link
                      href={`/company/${c.domain}`}
                      className="text-sm text-white font-medium group-hover:text-cyan-300 transition-colors"
                    >
                      {c.domain}
                    </Link>
                  </div>
                  {c.inferred_icp && (
                    <p className="text-xs text-gray-600 mt-0.5 pl-6 truncate max-w-[220px]">
                      {c.inferred_icp}
                    </p>
                  )}
                </div>

                {/* RII bar */}
                <div className="flex justify-center">
                  <RiiBar value={c.rii} />
                </div>

                {/* Sub-scores */}
                <div className="text-center"><ScoreCell value={c.alignment} /></div>
                <div className="text-center"><ScoreCell value={c.icp_clarity} /></div>
                <div className="text-center"><ScoreCell value={c.anchor_density} /></div>
                <div className="text-center"><ScoreCell value={c.positioning} /></div>

                {/* Risk badge */}
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${risk.bg} ${risk.text}`}>
                    <span className={`w-1 h-1 rounded-full ${risk.dot}`} />
                    {c.risk_level?.replace(" Exposure", "") ?? "–"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-6 justify-center text-xs text-gray-600">
          <span><span className="text-green-400 font-semibold">Low RII</span> = strong revenue architecture</span>
          <span><span className="text-yellow-400 font-semibold">Moderate RII</span> = structural misalignment signals</span>
          <span><span className="text-red-400 font-semibold">High RII</span> = significant revenue exposure</span>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 p-10">
          <p className="text-gray-400 text-sm mb-2">Don't see your company?</p>
          <h3 className="text-2xl font-bold text-white mb-6">
            Run a free Revenue Architecture Scan
          </h3>
          <Link
            href={PUBLIC_HOME_URL}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
          >
            Run Free Revenue Scan
          </Link>
          <p className="text-gray-600 text-xs mt-3">Instant scan — No signup required</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 text-center text-gray-600 text-xs">
        Vectri<span className="text-cyan-400">OS</span> Revenue Architecture Index — data sourced from anonymous public website scans.
        All scores based on structural messaging analysis only.
      </footer>
    </div>
  );
}
