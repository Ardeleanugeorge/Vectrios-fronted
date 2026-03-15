"use client"

import Link from "next/link"
import Header from "@/components/Header"

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Security & Data Handling</h1>
          <p className="text-lg text-gray-400">
            Infrastructure security and data handling practices for Revenue-Stage Monitoring Infrastructure.
          </p>
        </div>

        {/* Infrastructure Security */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Infrastructure Security</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Data Encryption</h3>
              <p className="text-gray-400">
                All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Database connections are secured and credentials are never stored in plain text.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Access Controls</h3>
              <p className="text-gray-400">
                Role-based access control (RBAC) ensures users can only access data associated with their company. Authentication uses secure password hashing (bcrypt) and JWT tokens for session management.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Monitoring & Audit Logging</h3>
              <p className="text-gray-400">
                All system actions are logged with timestamps, user identification, and action types. Audit logs are retained for compliance and security analysis.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Backups</h3>
              <p className="text-gray-400">
                Daily encrypted backups are performed with 30-day retention. Backup restoration procedures are tested regularly.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Secure Authentication</h3>
              <p className="text-gray-400">
                Passwords are hashed using bcrypt with appropriate salt rounds. Session tokens expire after inactivity. Multi-factor authentication (MFA) roadmap available upon request.
              </p>
            </div>
          </div>
        </section>

        {/* Data Handling */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Data Handling</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Data Collection</h3>
              <p className="text-gray-400 mb-2">
                VectriOS collects the following data:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 ml-4">
                <li>Company profile information (name, website, ICP description, revenue objectives)</li>
                <li>Content URLs provided for structural analysis</li>
                <li>Performance metrics (close rates, ARR, deal size) when provided</li>
                <li>Structural assessment results and risk history</li>
                <li>Monitoring configuration and drift events</li>
              </ul>
              <p className="text-gray-400 mt-4 font-semibold">
                VectriOS does not access customer CRM data unless explicitly provided.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Storage</h3>
              <p className="text-gray-400">
                All data is stored in PostgreSQL databases hosted on secure cloud infrastructure. Data is encrypted at rest and access is restricted to authorized personnel only.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Retention</h3>
              <p className="text-gray-400">
                Structural assessments are retained for the duration of active monitoring plus 90 days after account closure. Risk history is retained for 2 years for trend analysis. See our <Link href="/data-retention" className="text-cyan-400 hover:text-cyan-300 underline">Data Retention & Deletion Policy</Link> for details.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Deletion</h3>
              <p className="text-gray-400">
                Account deletion triggers immediate soft delete. Hard delete occurs after 90 days. All associated data (assessments, risk history, monitoring data) is permanently removed. See our <Link href="/data-retention" className="text-cyan-400 hover:text-cyan-300 underline">Data Retention & Deletion Policy</Link> for complete deletion procedures.
              </p>
            </div>
          </div>
        </section>

        {/* GDPR / EU Compliance */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">GDPR / EU Compliance</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Lawful Basis for Processing</h3>
              <p className="text-gray-400">
                VectriOS processes personal data based on contractual necessity (service provision) and legitimate interest (monitoring and analysis). Consent is obtained during account creation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Subject Rights</h3>
              <p className="text-gray-400 mb-2">
                EU data subjects have the right to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 ml-4">
                <li><strong>Access:</strong> Request a copy of all personal data held</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> Request deletion of personal data</li>
                <li><strong>Portability:</strong> Export data in machine-readable format</li>
                <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
              </ul>
              <p className="text-gray-400 mt-4">
                Requests can be submitted via email to privacy@vectrios.com or through account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Processing Agreement (DPA)</h3>
              <p className="text-gray-400">
                Standard DPA available upon request for enterprise customers. Custom DPA terms can be negotiated for high-volume contracts.
              </p>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="mb-12 border-b border-gray-800 pb-12">
          <h2 className="text-2xl font-bold mb-6">Data Export</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              All monitoring data can be exported in PDF or CSV format. Export includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 ml-4">
              <li>Structural assessment history</li>
              <li>Risk index progression</li>
              <li>Drift events and volatility metrics</li>
              <li>Revenue impact projections</li>
              <li>Executive summaries</li>
            </ul>
            <p className="text-gray-400 mt-4">
              Export functionality is available in the dashboard under account settings. Enterprise customers can request bulk exports via support.
            </p>
          </div>
        </section>

        {/* SOC 2 Roadmap */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Compliance Roadmap</h2>
          <div className="space-y-4 text-gray-300">
            <p className="text-gray-400">
              VectriOS is committed to enterprise-grade security and compliance. SOC 2 Type II certification is planned for Q3 2025. Current security practices align with SOC 2 requirements.
            </p>
            <p className="text-gray-400">
              For specific compliance requirements or security questionnaires, contact security@vectrios.com.
            </p>
          </div>
        </section>

        {/* Links */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
              Privacy Policy →
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
