"use client"

import Link from "next/link"
import Header from "@/components/Header"

// Every period on this page must be one VectriOS actually applies.
const LAST_UPDATED = "November 24, 2026"
const CONTACT = "support@vectrios.com"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 border-b border-gray-200 pb-10">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="space-y-3 text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

const ROWS: { what: string; kept: string }[] = [
  { what: "Account (email, password hash, company website)", kept: "While your account is active" },
  { what: "Readings, scores and change history of your site", kept: "While your account is active, so you can see the full history" },
  { what: "Competitor list and competitor readings", kept: "While your account is active" },
  { what: "Data read through connected services", kept: "While the connection is active" },
  { what: "Billing records", kept: "As long as tax and accounting law requires" },
]

export default function DataRetentionPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Data retention and deletion</h1>
          <p className="text-sm text-gray-600">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="What is kept, and for how long">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-semibold text-gray-900">Data</th>
                  <th className="py-2 font-semibold text-gray-900">Kept</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(r => (
                  <tr key={r.what} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-4">{r.what}</td>
                    <td className="py-2">{r.kept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Deleting your account">
          <p>Write to <a href={`mailto:${CONTACT}`} className="text-indigo-700 underline">{CONTACT}</a> from the email of your account. Within 30 days we stop monitoring, delete your account and its data, and confirm by email. Billing records stay as long as the law requires.</p>
          <p>Before deletion you can ask for a copy of your readings and score history as a CSV file.</p>
        </Section>

        <Section title="Cancelling a subscription">
          <p>Cancelling stops billing. Nightly monitoring stops when the subscription ends. Your account and history stay available until you ask us to delete them.</p>
        </Section>

        <Section title="Public website readings">
          <p>Readings of public websites in the benchmark are kept so that scores can be compared over time. If you own a domain and want it removed from the public benchmark, write to <a href={`mailto:${CONTACT}`} className="text-indigo-700 underline">{CONTACT}</a> and we remove it within 30 days.</p>
        </Section>

        <div className="pt-2">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="text-indigo-500 hover:text-cyan-300">Privacy policy →</Link>
            <Link href="/security" className="text-indigo-500 hover:text-cyan-300">Security →</Link>
          </div>
        </div>

      </main>
    </div>
  )
}
