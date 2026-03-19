"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

const SALES_EMAIL = "hello@vectrios.com"

export default function PricingPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")

  const canSend = useMemo(() => {
    return name.trim().length > 0 && email.trim().length > 0 && message.trim().length > 0
  }, [name, email, message])

  const handleSend = () => {
    if (!canSend) return

    const subject = encodeURIComponent(`Sales Inquiry - ${company.trim() || "VectriOS Prospect"}`)
    const body = encodeURIComponent(
      [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Company: ${company.trim() || "-"}`,
        "",
        "Message:",
        message.trim(),
      ].join("\n")
    )

    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Contact Sales</h1>
          <p className="text-gray-400">
            Tell us what you need and we will get back to you.
          </p>
        </div>

        <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Business Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
              placeholder="Company name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
              placeholder="What are you looking for?"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              canSend
                ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Contact Sales
          </button>

          <p className="text-xs text-gray-500 text-center">
            Clicking the button opens your email app and prepares the message to {SALES_EMAIL}.
          </p>
        </div>
      </main>
    </div>
  )
}

