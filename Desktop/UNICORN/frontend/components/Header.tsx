"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import DashboardHeader from "@/components/DashboardHeader"

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      setIsLoggedIn(!!token)
    } catch {
      setIsLoggedIn(false)
    }
  }, [])

  if (isLoggedIn) {
    return <DashboardHeader />
  }

  return (
    <header className="w-full border-b border-gray-800 bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
          Vectri<span className="text-cyan-400">OS</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/methodology#revenue-impact-index"
            className="text-gray-500 hover:text-gray-300 transition text-sm"
          >
            Methodology
          </Link>
          <Link href="/login" className="text-gray-400 hover:text-white transition text-sm">
            Log in
          </Link>
        </div>
      </div>
    </header>
  )
}
