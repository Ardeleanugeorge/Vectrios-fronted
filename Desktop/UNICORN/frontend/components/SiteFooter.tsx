import Link from "next/link"

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-10 text-center">
        <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
          Vectri<span className="text-cyan-500 dark:text-cyan-400">OS</span>
        </h3>
        <p className="text-slate-600 dark:text-gray-500 mb-4">
          Revenue-Stage Monitoring Infrastructure for B2B SaaS
        </p>
        <div className="flex flex-wrap justify-center gap-6 mb-5 text-sm">
          <Link href="/login" className="text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300">
            Login
          </Link>
          <Link href="/security" className="text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300">
            Security
          </Link>
          <Link href="/methodology#revenue-impact-index" className="text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300">
            Methodology &amp; RII
          </Link>
          <Link href="/privacy" className="text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300">
            Privacy
          </Link>
          <Link href="/data-retention" className="text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300">
            Data Retention
          </Link>
          <Link href="/account" className="text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300">
            Account
          </Link>
        </div>
        <p className="text-sm text-slate-500 dark:text-gray-600">
          © 2026 Vectri<span className="text-cyan-500 dark:text-cyan-400">OS</span>. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

