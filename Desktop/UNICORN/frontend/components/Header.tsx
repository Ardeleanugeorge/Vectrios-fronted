import Link from "next/link"

export default function Header() {
  return (
    <header className="w-full border-b border-gray-800 bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
          Vectri<span className="text-cyan-400">OS</span>
        </Link>
      </div>
    </header>
  )
}
