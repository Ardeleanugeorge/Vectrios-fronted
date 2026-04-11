"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/**
 * Dark stays default; light mode saved in localStorage (next-themes, key vectrios-theme).
 */
export default function LightModeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string
  /** When true, shows “Temă” for discoverability (e.g. Account). */
  showLabel?: boolean
}) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        aria-hidden
      >
        {showLabel ? (
          <span className="text-[11px] font-medium text-slate-500 dark:text-gray-500 whitespace-nowrap">
            Temă
          </span>
        ) : null}
        <div className="h-9 w-[168px] rounded-xl bg-slate-200/80 dark:bg-gray-800/50 animate-pulse" />
      </div>
    )
  }

  const isLight = resolvedTheme === "light"

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {showLabel ? (
        <span className="text-[11px] font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">
          Temă
        </span>
      ) : null}
    <div
      className={`inline-flex rounded-xl border border-slate-200 dark:border-gray-700 p-0.5 bg-slate-100 dark:bg-gray-900/80`}
      role="group"
      aria-label="Temă: întunecat sau luminos"
      title="Întunecat (implicit) sau mod luminos"
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          !isLight
            ? "bg-gray-800 text-white shadow-sm dark:bg-gray-700"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Întunecat
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          isLight
            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
        }`}
      >
        Luminos
      </button>
    </div>
    </div>
  )
}
