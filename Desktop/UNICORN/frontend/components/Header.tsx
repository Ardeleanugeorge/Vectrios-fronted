"use client"

import Link from "next/link"
import LightModeToggle from "@/components/LightModeToggle"
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
    <header className="w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-slate-900 hover:text-cyan-600 dark:text-white dark:hover:text-cyan-400 transition">
          Vectri<span className="text-cyan-500 dark:text-cyan-400">OS</span>
        </Link>
        <div className="flex items-center gap-3">
          <LightModeToggle className="max-sm:scale-90" />
          <Link href="/login" className="text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition text-sm">
            Log in
          </Link>
        </div>
      </div>
    </header>
  )
}
