"use client"

import Link from "next/link"
import Header from "@/components/Header"

// Change this date whenever the text below changes.
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

export default function PrivacyPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="What we collect">
          <h3 className="font-semibold text-gray-900">Your account</h3>
          <List items={[
            "Email address, used to sign in and to contact you about your account",
            "Password, stored only as a one-way hash (you can also sign in with one-time email codes)",
            "Company website and the competitor websites you choose to monitor",
            "Details you choose to add during onboarding, such as revenue band or close rates",
          ]} />
          <h3 className="font-semibold text-gray-900 pt-2">Readings of public websites</h3>
          <p>VectriOS reads the public pages of your website, of the competitors you add, and of the sites in the public benchmark. It stores the text it read, the headline found on each homepage and the resulting scores, so it can show history and report changes. It does not log in, fill forms or read pages behind a password.</p>
          <h3 className="font-semibold text-gray-900 pt-2">Connected services, only if you connect them</h3>
          <p>If you connect Google Search Console, Google Analytics 4 or HubSpot, VectriOS stores the access granted by that connection and the figures it reads through it. You can disconnect at any time.</p>
          <h3 className="font-semibold text-gray-900 pt-2">Billing</h3>
          <p>Payments are handled by Stripe. VectriOS stores your Stripe customer and subscription identifiers and the status of your plan. Card details go to Stripe and never reach VectriOS.</p>
        </Section>

        <Section title="How we use it">
          <List items={[
            "To read and score your website and your competitors' websites, and to show the results to you",
            "To sign you in, run your subscription and answer your support requests",
            "To check and improve the accuracy of readings and scores",
            "To meet legal obligations",
          ]} />
          <p>VectriOS does not sell, rent or trade your data, and does not use it for advertising.</p>
        </Section>

        <Section title="Service providers">
          <p>VectriOS uses these providers to run the service. Each processes data only to provide its part of it.</p>
          <List items={[
            "Vercel: hosting of the website",
            "Railway: hosting of the application servers",
            "Supabase: database",
            "Stripe: payments",
            "OpenAI: text analysis of public page content",
            "Jina AI and Firecrawl: reading of public web pages",
          ]} />
          <p>Data may also be disclosed when the law requires it, or to a buyer of the business, with notice to you.</p>
        </Section>

        <Section title="How long we keep it">
          <p>Your account data and your monitoring history are kept while your account is active. After you ask us to delete your account, we delete it within 30 days. The full rules are in the <Link href="/data-retention" className="text-indigo-700 underline">data retention policy</Link>.</p>
        </Section>

        <Section title="Your rights">
          <p>You can ask to access, correct, export or delete your personal data, to restrict its processing, or object to it. Write to <a href={`mailto:${CONTACT}`} className="text-indigo-700 underline">{CONTACT}</a> from the email of your account. We answer within 30 days.</p>
          <p>The legal basis for processing is the contract with you (to provide the service) and legitimate interest (to keep readings accurate and the service secure).</p>
        </Section>

        <Section title="Cookies">
          <p>The site uses cookies that are needed to sign you in and run the service. Other categories (functional, performance, targeting) are used only if you allow them in the cookie banner.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about privacy: <a href={`mailto:${CONTACT}`} className="text-indigo-700 underline">{CONTACT}</a></p>
        </Section>

        <div className="pt-2">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/security" className="text-indigo-500 hover:text-cyan-300">Security →</Link>
            <Link href="/data-retention" className="text-indigo-500 hover:text-cyan-300">Data retention →</Link>
          </div>
        </div>

      </main>
    </div>
  )
}
