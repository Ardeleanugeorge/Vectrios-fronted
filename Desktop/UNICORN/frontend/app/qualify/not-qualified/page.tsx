"use client"

import Link from "next/link"

export default function NotQualifiedPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          This Assessment Is Currently Designed for B2B SaaS Teams with Active Revenue Motion
        </h1>
        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
          If your company evolves into this stage, we'd be glad to reassess eligibility.
        </p>
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block px-8 py-3 border border-gray-700 hover:border-gray-600 text-gray-300 font-medium rounded-lg transition"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
