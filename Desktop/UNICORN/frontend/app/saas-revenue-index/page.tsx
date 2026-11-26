"use client";
import { apiFetch } from "@/lib/api"
import { API_URL, PUBLIC_HOME_URL } from '@/lib/config'
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { riiBand, riiRiskLabel, riiShown } from "@/lib/rii"
import { NAMES } from "@/config/messaging"

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

interface PublicStats {
  total_companies_analyzed: number;
  average_rii: number;
  monthly_loss: {
    average: number;
    min: number;
    max: number;
    basis: string;
  };
}

type RiskBand = "Low" | "Moderate" | "High" | null;

function normalizeRiskLabel(raw: string | null): RiskBand {
  if (!raw) return null;
  const r = raw.toLowerCase();
  // "Revenue Inefficiency Detected" was issued for the 40-69 band, so it maps
  // to Moderate despite how it reads; "High Exposure" was the band above it.
  if (r.includes("high") || r.includes("critical")) return "High";
  if (r.includes("moderate") || r.includes("compression") || r.includes("inefficiency")) return "Moderate";
  if (r.includes("low") || r.includes("efficient")) return "Low";
  return null;
}

function getRiskColor(risk: string | null) {
  if (!risk) return { bg: "bg-gray-500/10", text: "text-gray-600", dot: "bg-gray-500" };
  const r = risk.toLowerCase();
  // Older rows carry the previous vocabulary ("Revenue Inefficiency Detected",
  // "High Exposure"), so both are recognised. New scans say what was measured.
  if (r.includes("high") || r.includes("critical") || r.includes("inefficiency"))
    return { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" };
  if (r.includes("moderate") || r.includes("compression"))
    return { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-500" };
  return { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-500" };
}

function RiiBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600">—</span>;
  const pct = Math.min(value, 100);
  const color = {
    high: "from-red-500 to-orange-500",
    moderate: "from-yellow-500 to-amber-500",
    low: "from-green-500 to-cyan-500",
  }[riiBand(value)];
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-right font-mono text-sm font-semibold text-gray-900">
        {riiShown(value)}
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
  const [data, setData]             = useState<IndexData | null>(null);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | "high" | "moderate" | "low">("all");
  const [search, setSearch]         = useState("");

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/scan-results");
  };

  useEffect(() => {
    // Fetch index table data
    apiFetch(`/saas-revenue-index`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((err) => { console.error("[SAAS-INDEX] Fetch error:", err); setData(null); })
      .finally(() => setLoading(false));

    // Fetch real public stats from scan_results
    fetch(`https://api.vectrios.com/public/index-stats`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setPublicStats)
      .catch((err) => { console.error("[PUBLIC-STATS] Fetch error:", err); });
  }, []);

  const companies = data?.companies ?? [];
  const filtered = companies.filter(c => {
    const matchFilter =
      filter === "all" ? true :
      c.rii !== null && riiBand(c.rii) === filter;
    const matchSearch =
      search === "" ? true :
      c.domain.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const s = data?.stats;

  // Real numbers from backend — fallback to index stats if public stats loaded
  const displayTotal    = publicStats?.total_companies_analyzed ?? s?.total_companies ?? 0;
  const displayAvgRii   = publicStats?.average_rii?.toFixed(1) ?? (s?.average_rii !== null ? s?.average_rii?.toFixed(1) : "—");
  // Financial exposure removed - structural evidence only

  return (
    <div className="page-root font-sans">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href={PUBLIC_HOME_URL} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-900 tracking-wide">
            Vectri<span className="text-indigo-500">OS</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back
          </button>
          <Link
            href={PUBLIC_HOME_URL}
            className="text-xs text-indigo-500 hover:text-cyan-300 transition-colors"
          >
            Run your own scan
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {NAMES.benchmark}
          </h1>
          <p className="text-gray-700 text-lg max-w-2xl mx-auto mb-2">
            {displayTotal.toLocaleString("en-US")} B2B SaaS websites, each read once with the same method version.
          </p>
        </div>

        {/* Rankings withheld while the scoring is validated (decision of 26 Nov 2026) */}
        <div className="mb-10 p-6 rounded-xl border border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">Individual scores withheld</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            Controlled testing showed that parts of the current scoring model do not yet respond consistently to the messaging
            changes they are intended to measure. Until the rebuilt model passes its acceptance tests and an independent human
            evaluation, VectriOS does not publish individual company scores, rankings or risk classifications.
          </p>
          <p className="text-sm text-gray-800 mt-3">
            <Link href="/methodology" className="text-indigo-700 underline">What is established and what is under validation</Link>
          </p>
        </div>

        {/* How the benchmark works */}
        <div className="mb-10 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">How the benchmark is built</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">1. Public pages only</p>
              <p className="text-xs text-gray-600">The homepage and up to 4 key pages of each site (pricing, product, solutions, customers), read the same way as a customer&apos;s site.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">2. Each site once</p>
              <p className="text-xs text-gray-600">Every site is read once per method version. Scans run from this site are not added to the benchmark.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">3. One method version</p>
              <p className="text-xs text-gray-600">All readings come from the same version of the method. When the method changes, the whole benchmark is read again.</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 p-10">
          <p className="text-gray-600 text-sm mb-2">See how your site describes who it serves and why to choose it</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Run a free messaging scan
          </h3>
          <Link
            href={PUBLIC_HOME_URL}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm transition-colors"
          >
            Run a free scan
          </Link>
          <p className="text-gray-600 text-xs mt-3">Instant scan — No signup required</p>
        </div>
      </main>

      <footer className="border-t border-white/5 px-6 py-6 text-center text-gray-600 text-xs">
        Vectri<span className="text-indigo-500">OS</span> {NAMES.benchmark}: public pages of the SaaS sites in the current benchmark, each read once with the same method.
        Individual scores are withheld while the scoring method is validated.
      </footer>
    </div>
  );
}
