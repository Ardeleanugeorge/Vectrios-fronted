"use client";

/**
 * Public page of one benchmark site.
 *
 * Individual company scores are withheld while the scoring method is validated
 * (decision of 26 Nov 2026: controlled tests showed parts of the score do not
 * measure what they claim). This page names no score and no risk class; it
 * says why, and links to the methodology. The API returns no per-site reading
 * either (/company/{domain}/history).
 */
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

export default function CompanyPage() {
  const params = useParams();
  const domain = decodeURIComponent(String(params?.domain || "")).toLowerCase();
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-gray-900 mt-6 mb-4">{domain || "This site"}</h1>
        <div className="p-6 rounded-xl border border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">No public scores</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            VectriOS publishes no scores, rankings or risk classifications for companies. A free scan shows what any site
            says on its key pages, quoted with the page it says it on.
          </p>
          <p className="text-sm text-gray-800 mt-3">
            <Link href="/methodology" className="text-indigo-700 underline">Read the methodology</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
