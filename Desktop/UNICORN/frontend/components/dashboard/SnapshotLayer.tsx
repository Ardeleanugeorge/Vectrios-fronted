"use client"
/**
 * The dashboard before nightly monitoring starts: a link back to the last scan
 * (what the site says, quoted) and what monitoring adds. No score - the
 * experimental score left every customer surface on 26 Nov 2026.
 */
import Link from "next/link"
import { NAMES } from "@/config/messaging"

interface SnapshotLayerProps {
  diagnostic: { scan_token?: string | null } | null
  companyId?: string | null
}

const INCLUDES = [
  "Your homepage and up to four key pages, and up to five competitors', read every night",
  "Your site and your competitors on the same lines: headline, who it is for, proof, pricing",
  "A note when the headline, who it is for, proof, prices or free offer changes, once two consecutive nightly readings confirm it",
]

export default function SnapshotLayer({ diagnostic }: SnapshotLayerProps) {
  const token = diagnostic?.scan_token || null
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-xl border border-gray-200 bg-gray-50">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{NAMES.scan}</p>
        <p className="text-lg font-semibold text-gray-900 mb-1">Your scan is saved</p>
        <p className="text-sm text-gray-600 mb-4">
          It shows what your site says on its key pages, each line quoted with the page it comes from.
        </p>
        {token ? (
          <Link href={`/scan-results?token=${encodeURIComponent(token)}`}
                className="inline-block px-4 py-2 rounded-lg border border-gray-900 text-sm font-semibold text-gray-900 hover:bg-white">
            Open your scan
          </Link>
        ) : null}
      </div>

      <div className="p-6 rounded-xl border border-gray-200 bg-white">
        <p className="text-xs uppercase tracking-widest text-indigo-600 mb-2">{NAMES.monitoring}</p>
        <ul className="space-y-2 text-sm text-gray-700 mb-5">
          {INCLUDES.map((l) => (
            <li key={l} className="flex gap-2"><span className="text-emerald-500" aria-hidden>✓</span><span>{l}</span></li>
          ))}
        </ul>
        <Link href="/pricing?from=dashboard&focus=monitoring"
              className="inline-block px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm">
          {NAMES.activateMonitoring}
        </Link>
      </div>
    </div>
  )
}
