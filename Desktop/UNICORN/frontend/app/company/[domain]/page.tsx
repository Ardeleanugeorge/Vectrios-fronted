"use client";

import { API_URL, PUBLIC_HOME_URL } from '@/lib/config'

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { METHODOLOGY_RII_HREF, RII_ABBREV, RII_NAME, RII_TAGLINE } from "@/lib/rii";

const API = process.env.NEXT_PUBLIC_API_URL || `${API_URL}`;

interface HistoryPoint {
  rii: number;
  alignment: number | null;
  icp_clarity: number | null;
  anchor_density: number | null;
  positioning: number | null;
  confidence: number | null;
  risk_level: string | null;
  scanned_at: string;
}

interface LatestScan {
  rii: number;
  alignment: number | null;
  icp_clarity: number | null;
  anchor_density: number | null;
  positioning: number | null;
  confidence: number | null;
  risk_level: string | null;
  inferred_icp: string | null;
  pages_scanned: number | null;
  primary_signal: string | null;
  scanned_at: string | null;
}

interface CompanyHistory {
  domain: string;
  scan_count: number;
  trend: "improving" | "degrading" | "stable" | null;
  latest: LatestScan;
  history: HistoryPoint[];
}

// ── SVG Trend Chart ──────────────────────────────────────────────────────────
function TrendChart({ history }: { history: HistoryPoint[] }) {
  const W = 600, H = 160, PAD = 24;
  const riis = history.map(h => h.rii);
  const minR = Math.max(0,   Math.min(...riis) - 10);
  const maxR = Math.min(100, Math.max(...riis) + 10);

  const x = (i: number) => PAD + (i / Math.max(history.length - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + ((maxR - v) / (maxR - minR || 1)) * (H - PAD * 2);

  const points = history.map((h, i) => `${x(i)},${y(h.rii)}`).join(" ");
  const areaPoints = [
    `${x(0)},${H - PAD}`,
    ...history.map((h, i) => `${x(i)},${y(h.rii)}`),
    `${x(history.length - 1)},${H - PAD}`,
  ].join(" ");

  const firstRii = riis[0], lastRii = riis[riis.length - 1];
  const delta = lastRii - firstRii;
  const lineColor = delta < -2 ? "#34d399" : delta > 2 ? "#f87171" : "#facc15";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
        {/* Grid lines */}
        {[25, 50, 75].map(v => (
          <line
            key={v}
            x1={PAD} y1={y(v)} x2={W - PAD} y2={y(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <polygon points={areaPoints} fill={lineColor} fillOpacity="0.06" />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {history.map((h, i) => (
          <circle
            key={i}
            cx={x(i)} cy={y(h.rii)}
            r="4"
            fill={lineColor}
            stroke="#0B0F19"
            strokeWidth="2"
          />
        ))}
        {/* First / last labels */}
        {history.length >= 2 && (
          <>
            <text x={x(0)} y={H - 4} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.3)">
              {formatDate(history[0].scanned_at)}
            </text>
            <text x={x(history.length - 1)} y={H - 4} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.3)">
              {formatDate(history[history.length - 1].scanned_at)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// ── Metric bar ────────────────────────────────────────────────────────────────
function MetricBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const color = v >= 65 ? "from-emerald-500 to-green-400"
    : v >= 40 ? "from-yellow-500 to-orange-400"
    : "from-red-500 to-orange-500";
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-bold text-white">{value !== null ? Math.round(v) : "—"}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${Math.min(v, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return null;
  const map = {
    improving: { label: "↓ Improving", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
    degrading:  { label: "↑ Degrading",  cls: "bg-red-500/10 border-red-500/30 text-red-400" },
    stable:     { label: "→ Stable",     cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
  };
  const m = map[trend as keyof typeof map];
  if (!m) return null;
  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompanyProfilePage() {
  const { domain } = useParams<{ domain: string }>();
  const [data, setData]     = useState<CompanyHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!domain) return;
    fetch(`${API}/company/${domain}/history`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError("No scan history found for this company."))
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading) return (
    <div className="page-root flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading profile…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="page-root flex items-center justify-center">
      <div className="text-center max-w-sm">
        <p className="text-gray-400 mb-4">{error || "Company not found."}</p>
        <Link href="/saas-revenue-index" className="text-cyan-400 hover:underline text-sm">
          ← Back to index
        </Link>
      </div>
    </div>
  );

  const { latest, history } = data;
  const rii = latest.rii ?? 0;
  const riiColor = rii >= 70 ? "text-red-400" : rii >= 40 ? "text-orange-400" : "text-emerald-400";
  const firstRii = history[0]?.rii ?? rii;
  const delta = Math.round(rii - firstRii);

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
        <Link href="/saas-revenue-index" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Revenue Architecture Index
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* Company header */}
        <div className="flex items-center gap-4 mb-10">
          <img
            src={`https://www.google.com/s2/favicons?domain=${data.domain}&sz=32`}
            alt="" className="w-10 h-10 rounded-lg opacity-80"
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <div>
            <h1 className="text-2xl font-bold text-white">{data.domain}</h1>
            {latest.inferred_icp && (
              <p className="text-sm text-gray-500">{latest.inferred_icp}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <TrendBadge trend={data.trend} />
            <a
              href={`https://${data.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              Visit site ↗
            </a>
          </div>
        </div>

        {/* Revenue Impact Index (RII) + delta */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="col-span-1 rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-500/80 mb-1">Core metric</p>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{RII_NAME}</p>
            <p className="text-[10px] text-gray-500 mb-2">
              <abbr title={RII_TAGLINE} className="cursor-help text-cyan-400/90 border-b border-dotted border-cyan-500/50 font-semibold">
                {RII_ABBREV}
              </abbr>
              <span> · current</span>
            </p>
            <p className={`text-5xl font-bold ${riiColor}`}>{Math.round(rii)}</p>
            <p className={`text-sm mt-1 ${riiColor}`}>{latest.risk_level}</p>
            <Link
              href={METHODOLOGY_RII_HREF}
              className="text-[10px] text-cyan-600 hover:text-cyan-400 hover:underline mt-2 inline-block"
            >
              What is {RII_ABBREV}? →
            </Link>
          </div>
          <div className="col-span-1 rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Trend Change</p>
            <p className={`text-4xl font-bold ${delta < 0 ? "text-emerald-400" : delta > 0 ? "text-red-400" : "text-yellow-400"}`}>
              {delta === 0 ? "—" : delta > 0 ? `+${delta}` : `${delta}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">vs first scan</p>
          </div>
          <div className="col-span-1 rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Scans</p>
            <p className="text-4xl font-bold text-white">{data.scan_count}</p>
            <p className="text-xs text-gray-500 mt-1">data points</p>
          </div>
        </div>

        {/* Trend chart */}
        {history.length >= 2 ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                {RII_NAME} trend <span className="text-gray-600 normal-case">({RII_ABBREV})</span>
              </p>
              <p className="text-xs text-gray-600">{history.length} data points</p>
            </div>
            <TrendChart history={history} />
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Lower {RII_ABBREV} = stronger architecture</span>
              <span>Higher {RII_ABBREV} = higher modeled exposure</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 mb-6 text-center text-gray-600 text-sm">
            Only 1 scan recorded. Trend chart appears after the second scan.
          </div>
        )}

        {/* Structural breakdown */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Structural Breakdown (latest scan)</p>
          <p className="text-[11px] text-gray-600 mb-5">
            Sub-scores feed your headline {RII_ABBREV}.{" "}
            <Link href={METHODOLOGY_RII_HREF} className="text-cyan-600 hover:text-cyan-400 hover:underline">
              How they combine →
            </Link>
          </p>
          <div className="space-y-5">
            <MetricBar label="Messaging Alignment"   value={latest.alignment} />
            <MetricBar label="ICP Clarity"           value={latest.icp_clarity} />
            <MetricBar label="Anchor Density"        value={latest.anchor_density} />
            <MetricBar label="Positioning Coherence" value={latest.positioning} />
          </div>
        </div>

        {/* Scan history table */}
        {history.length >= 2 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden mb-8">
            <div className="px-5 py-3 border-b border-white/5">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Scan History</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-600 uppercase tracking-widest">
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-center" title={RII_TAGLINE}>
                    {RII_ABBREV}
                  </th>
                  <th className="px-5 py-3 text-center">Align</th>
                  <th className="px-5 py-3 text-center">ICP</th>
                  <th className="px-5 py-3 text-center">Anchor</th>
                  <th className="px-5 py-3 text-center">Pos.</th>
                  <th className="px-5 py-3 text-center">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h, i) => {
                  const prev = history[history.length - 2 - i];
                  const riidelta = prev ? Math.round(h.rii - prev.rii) : null;
                  return (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                        {new Date(h.scanned_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-bold font-mono ${
                          h.rii >= 70 ? "text-red-400" :
                          h.rii >= 40 ? "text-orange-400" : "text-emerald-400"
                        }`}>
                          {Math.round(h.rii)}
                        </span>
                        {riidelta !== null && riidelta !== 0 && (
                          <span className={`ml-1 text-xs ${riidelta > 0 ? "text-red-500" : "text-emerald-500"}`}>
                            {riidelta > 0 ? `+${riidelta}` : riidelta}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-400 font-mono text-xs">{h.alignment !== null ? Math.round(h.alignment) : "—"}</td>
                      <td className="px-5 py-3 text-center text-gray-400 font-mono text-xs">{h.icp_clarity !== null ? Math.round(h.icp_clarity) : "—"}</td>
                      <td className="px-5 py-3 text-center text-gray-400 font-mono text-xs">{h.anchor_density !== null ? Math.round(h.anchor_density) : "—"}</td>
                      <td className="px-5 py-3 text-center text-gray-400 font-mono text-xs">{h.positioning !== null ? Math.round(h.positioning) : "—"}</td>
                      <td className="px-5 py-3 text-center text-gray-400 font-mono text-xs">{h.confidence !== null ? `${Math.round(h.confidence)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CTA */}
        <div className="text-center rounded-xl bg-white/[0.03] border border-white/5 p-8">
          <p className="text-gray-400 text-sm mb-1">Want to track your own company?</p>
          <h3 className="text-xl font-bold text-white mb-5">Get the full revenue diagnostic</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={PUBLIC_HOME_URL}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
            >
              ⚡ Scan your website
            </Link>
            <Link
              href="/saas-revenue-index"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-colors"
            >
              ← Back to index
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
