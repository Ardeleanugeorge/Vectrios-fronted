import Link from "next/link"

export default function Header() {
  return (
    <header className="w-full border-b border-gray-800 bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
          Vectri<span className="text-cyan-400">OS</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-gray-400 hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center rounded-lg border border-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-800 transition"
          >
            Account
          </Link>
        </div>
      </div>
    </header>
  )
}
