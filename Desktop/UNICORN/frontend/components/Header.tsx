"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accountHref, setAccountHref] = useState("/account")

  useEffect(() => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      const logged = !!token
      setIsLoggedIn(logged)
      if (!logged) {
        setAccountHref("/account")
        return
      }

      const userDataRaw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
      if (!userDataRaw) {
        setAccountHref("/account")
        return
      }
      const parsed = JSON.parse(userDataRaw) as { company_id?: string | null }
      setAccountHref(parsed?.company_id ? "/dashboard" : "/account")
    } catch {
      setIsLoggedIn(false)
      setAccountHref("/account")
    }
  }, [])

  return (
    <header className="w-full border-b border-gray-800 bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
          Vectri<span className="text-cyan-400">OS</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {isLoggedIn ? (
            <Link
              href={accountHref}
              className="inline-flex items-center rounded-lg border border-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-800 transition"
            >
              Account
            </Link>
          ) : (
            <Link href="/login" className="text-gray-400 hover:text-white transition">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
