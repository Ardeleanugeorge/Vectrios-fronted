"use client"

import Link from "next/link"
import Header from "@/components/Header"

export default function PrivacyPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* What We Collect */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">What We Collect</h2>
          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="font-semibold mb-3">Account Information</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Email address (required for account creation)</li>
                <li>Company name</li>
                <li>Password (hashed, never stored in plain text)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company Profile Data</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Website URL</li>
                <li>ICP (Ideal Customer Profile) description</li>
                <li>Revenue objectives and targets</li>
                <li>Performance metrics (close rates, ARR, deal size) when provided</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Content URLs</h3>
              <p className="text-gray-400">
                URLs to content assets (landing pages, sales pages, marketing materials) provided for structural analysis. Vectri<span className="text-cyan-400">OS</span> accesses publicly available content at these URLs. We do not access password-protected or private content unless explicitly granted access.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Monitoring Data</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Structural assessment results</li>
                <li>Risk index calculations</li>
                <li>Drift events and volatility metrics</li>
                <li>Revenue impact projections</li>
                <li>Trend analysis data</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Usage Data</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Login timestamps</li>
                <li>Feature usage (dashboard views, exports, settings changes)</li>
                <li>System actions (re-scans, monitoring activation)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* What We Do NOT Collect */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">What We Do NOT Collect</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400 font-semibold">
              Vectri<span className="text-cyan-400">OS</span> does not access customer CRM data unless explicitly provided.
            </p>
            <p className="text-gray-400">
              We do not collect:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li>Customer contact information from your CRM</li>
              <li>Sales pipeline data</li>
              <li>Email communications</li>
              <li>Calendar or meeting data</li>
              <li>Third-party integration credentials (unless explicitly authorized)</li>
              <li>Payment card information (handled by payment processor)</li>
            </ul>
          </div>
        </section>

        {/* How We Use Data */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">How We Use Your Data</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Service Provision</h3>
              <p className="text-gray-400">
                To provide revenue-stage monitoring, structural analysis, drift detection, and impact modeling.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Account Management</h3>
              <p className="text-gray-400">
                To authenticate users, manage subscriptions, and provide customer support.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Monitoring & Analysis</h3>
              <p className="text-gray-400">
                To perform structural assessments, calculate risk metrics, detect drift, and generate revenue impact projections.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Service Improvement</h3>
              <p className="text-gray-400">
                To improve monitoring accuracy, refine drift detection algorithms, and enhance impact modeling (using aggregated, anonymized data).
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Legal Compliance</h3>
              <p className="text-gray-400">
                To comply with legal obligations, respond to legal requests, and protect rights and safety.
              </p>
            </div>
          </div>
        </section>

        {/* Data Sharing */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">Data Sharing</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              Vectri<span className="text-cyan-400">OS</span> does not sell, rent, or trade your data. We share data only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li><strong>Service Providers:</strong> With trusted third-party services (hosting, payment processing) under strict confidentiality agreements</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice)</li>
            </ul>
          </div>
        </section>

        {/* Data Retention */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">Data Retention</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              We retain data for as long as necessary to provide services and comply with legal obligations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li><strong>Active Accounts:</strong> Data retained for duration of active subscription</li>
              <li><strong>Account Closure:</strong> Soft delete after closure, hard delete after 90 days</li>
              <li><strong>Structural Assessments:</strong> Retained for active monitoring period + 90 days</li>
              <li><strong>Risk History:</strong> Retained for 2 years for trend analysis</li>
              <li><strong>Audit Logs:</strong> Retained for 1 year for security and compliance</li>
            </ul>
            <p className="text-gray-400 mt-4">
              See our <Link href="/data-retention" className="text-cyan-400 hover:text-cyan-300 underline">Data Retention & Deletion Policy</Link> for complete details.
            </p>
          </div>
        </section>

        {/* Your Rights */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">Your Rights</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Export your data in machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
            </ul>
            <p className="text-gray-400 mt-4">
              To exercise these rights, contact privacy@vectrios.com or use account settings.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Contact</h2>
          <div className="space-y-2 text-gray-300">
            <p className="text-gray-400">
              For privacy-related questions or requests:
            </p>
            <p className="text-gray-400">
              Email: <a href="mailto:privacy@vectrios.com" className="text-cyan-400 hover:text-cyan-300">privacy@vectrios.com</a>
            </p>
          </div>
        </section>

        {/* Links */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/security" className="text-cyan-400 hover:text-cyan-300">
              Security & Data Handling →
            </Link>
            <Link href="/data-retention" className="text-cyan-400 hover:text-cyan-300">
              Data Retention Policy →
            </Link>
            <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">
              Terms of Service →
            </Link>
          </div>
        </div>

      </main>
    </div>
  )
}
