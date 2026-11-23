"use client"

import Link from "next/link"
import Header from "@/components/Header"

// Every line on this page must be true today. Planned work goes under "Not yet in place".
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

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside space-y-1 ml-5">
      {items.map(i => <li key={i}>{i}</li>)}
    </ul>
  )
}

export default function SecurityPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Security</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            What VectriOS does to protect your account and data today, and what is not yet in place.
          </p>
          <p className="text-sm text-gray-600 mt-3">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="What VectriOS can see">
          <p>VectriOS reads public web pages only. It never needs access to your website&apos;s code, servers, CMS or analytics to work. Integrations with Search Console, GA4 and HubSpot are optional and read-only.</p>
        </Section>

        <Section title="Infrastructure">
          <List items={[
            "All traffic to vectrios.com and to the API is encrypted with HTTPS (TLS).",
            "The database runs on Supabase, which encrypts stored data at rest.",
            "Application servers run on Railway; the website runs on Vercel.",
            "Payments run on Stripe. Card details never reach VectriOS.",
            "Secrets such as API keys are kept in the hosting provider's encrypted settings, not in the code.",
          ]} />
        </Section>

        <Section title="Accounts and access">
          <List items={[
            "Passwords are stored only as one-way bcrypt hashes. Sign-in also works with one-time codes sent by email.",
            "Each account sees only its own company's data.",
            "Account and monitoring actions are recorded in an audit log.",
          ]} />
        </Section>

        <Section title="Not yet in place">
          <List items={[
            "SOC 2 or ISO 27001 certification",
            "Multi-factor authentication",
            "Single sign-on (SSO)",
            "Team accounts with roles",
          ]} />
          <p>If your security review needs one of these, tell us. It helps us decide what comes first.</p>
        </Section>

        <Section title="Security questionnaires and reports">
          <p>For a security questionnaire, a data processing agreement (DPA) or to report a vulnerability, write to <a href={`mailto:${CONTACT}`} className="text-indigo-700 underline">{CONTACT}</a>.</p>
        </Section>

        <div className="pt-2">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="text-indigo-500 hover:text-cyan-300">Privacy policy →</Link>
            <Link href="/data-retention" className="text-indigo-500 hover:text-cyan-300">Data retention →</Link>
          </div>
        </div>

      </main>
    </div>
  )
}
