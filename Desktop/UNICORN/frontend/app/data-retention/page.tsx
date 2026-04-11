"use client"

import Link from "next/link"
import Header from "@/components/Header"

export default function DataRetentionPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Data Retention & Deletion Policy</h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Overview */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Overview</h2>
          <p className="text-gray-400 leading-relaxed">
            This policy defines how Vectri<span className="text-cyan-400">OS</span> retains and deletes data. Retention periods are designed to balance service functionality, compliance requirements, and user privacy.
          </p>
        </section>

        {/* Retention Periods */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Retention Periods</h2>
          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="font-semibold mb-3">Structural Assessments</h3>
              <p className="text-gray-400">
                Retained for the duration of active monitoring plus 90 days after account closure. Assessments are essential for trend analysis and drift detection.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Risk History</h3>
              <p className="text-gray-400">
                Daily risk snapshots retained for 2 years. Enables longitudinal trend analysis and volatility calculation. After 2 years, data is aggregated into monthly summaries.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Drift Events</h3>
              <p className="text-gray-400">
                Retained for 1 year. Critical for understanding structural degradation patterns and alert history.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Monitoring Configuration</h3>
              <p className="text-gray-400">
                Retained for active account duration. Deleted 30 days after account closure.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Audit Logs</h3>
              <p className="text-gray-400">
                System actions, login events, and configuration changes retained for 1 year for security and compliance analysis.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Backup Retention</h3>
              <p className="text-gray-400">
                Daily encrypted backups retained for 30 days. Weekly backups retained for 90 days. Monthly backups retained for 1 year.
              </p>
            </div>
          </div>
        </section>

        {/* Account Deletion Flow */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Account Deletion Flow</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Immediate Actions (Day 0)</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Account marked as deleted (soft delete)</li>
                <li>Monitoring cycles stopped</li>
                <li>New assessments blocked</li>
                <li>API access revoked</li>
                <li>User authentication disabled</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Soft Delete Period (Days 1-90)</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Data remains in database but inaccessible</li>
                <li>Recovery possible upon request</li>
                <li>Export functionality remains available</li>
                <li>Billing stopped immediately</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Hard Delete (After Day 90)</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>All company data permanently deleted</li>
                <li>All structural assessments removed</li>
                <li>All risk history deleted</li>
                <li>All monitoring configuration erased</li>
                <li>All associated user accounts anonymized</li>
                <li>Backup data scheduled for deletion</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Export Before Deletion */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Data Export Before Deletion</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              Before account deletion, you can export all monitoring data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li>Structural assessment history (PDF or CSV)</li>
              <li>Risk index progression (CSV)</li>
              <li>Drift events log (CSV)</li>
              <li>Revenue impact projections (CSV)</li>
              <li>Executive summaries (PDF)</li>
            </ul>
            <p className="text-gray-400 mt-4">
              Export functionality is available in account settings. You can request bulk exports via support.
            </p>
          </div>
        </section>

        {/* Legal Retention Requirements */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Legal Retention Requirements</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              Certain data may be retained longer if required by law:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li>Financial records: 7 years (for tax compliance)</li>
              <li>Audit logs: 1 year minimum (may extend for legal holds)</li>
              <li>Contract data: Duration of contract + 7 years</li>
            </ul>
            <p className="text-gray-400 mt-4">
              Legal holds may extend retention periods. Affected users will be notified.
            </p>
          </div>
        </section>

        {/* Requesting Deletion */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Requesting Deletion</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              Account deletion can be initiated:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
              <li>Via account settings (self-service)</li>
              <li>Via email request to privacy@vectrios.com</li>
              <li>Via support ticket</li>
            </ul>
            <p className="text-gray-400 mt-4">
              Deletion requests are processed within 48 hours. Confirmation email sent upon completion.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Contact</h2>
          <div className="space-y-2 text-gray-300">
            <p className="text-gray-400">
              For questions about data retention or deletion:
            </p>
            <p className="text-gray-400">
              Email: <a href="mailto:privacy@vectrios.com" className="text-cyan-400 hover:text-cyan-300">privacy@vectrios.com</a>
            </p>
          </div>
        </section>

        {/* Links */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/security" className="text-cyan-400 hover:text-cyan-300">
              Security & Data Handling →
            </Link>
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
              Privacy Policy →
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
