"use client";
/**
 * The public SaaS benchmark is paused (decision of 26 Nov 2026): it ranked
 * sites by the experimental score, which was withdrawn from the product until
 * a rebuilt version passes validation. No aggregate of that score is shown
 * either - an average of a number that does not measure what it claims is not
 * a finding. The address stays so old links land on an explanation.
 */
import Link from "next/link";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { PUBLIC_HOME_URL } from "@/lib/config";

export default function BenchmarkPausedPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">SaaS messaging benchmark</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">The benchmark is paused</h1>
        <p className="text-gray-700 leading-relaxed mb-4">
          The benchmark ranked SaaS sites by an experimental messaging score. Controlled tests showed that parts of the score did
          not measure what they were meant to, so it was withdrawn on 26 November 2026, and the benchmark with it.
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          A free scan shows what any site says on its key pages, quoted with the page it says it on.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={PUBLIC_HOME_URL} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm">
            Scan a site free
          </Link>
          <Link href="/methodology" className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-900 font-semibold text-sm">
            Read the methodology
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
