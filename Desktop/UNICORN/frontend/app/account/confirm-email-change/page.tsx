"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from "@/lib/config"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function ConfirmEmailChangePage() {
  const params = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Confirming email change...")

  useEffect(() => {
    const token = params.get("token")
    if (!token) {
      setStatus("error")
      setMessage("Missing confirmation token.")
      return
    }

    ;(async () => {
      try {
        const res = await apiFetch(`/account/email-change-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          setStatus("error")
          setMessage(payload?.detail || "Could not confirm email change.")
          return
        }
        setStatus("success")
        setMessage(payload?.message || "Email updated successfully.")
      } catch {
        setStatus("error")
        setMessage("Network error while confirming email change.")
      }
    })()
  }, [params])

  return (
    <div className="page-root flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#111827] p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Email Change Verification</h1>
        <p className={status === "error" ? "text-red-400" : status === "success" ? "text-emerald-300" : "text-gray-300"}>
          {message}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Back to account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}
