interface ResultCardProps {
  title: string
  value: string
  level?: "HIGH" | "MODERATE" | "LOW"
}

export default function ResultCard({ title, value, level }: ResultCardProps) {
  const getColor = () => {
    if (!level) return "text-white"
    if (level === "HIGH") return "text-red-500"
    if (level === "MODERATE") return "text-yellow-400"
    return "text-green-500"
  }

  return (
    <div className="bg-[#111827] p-6 rounded-xl border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className={`text-3xl font-semibold ${getColor()}`}>
        {value}
      </p>
    </div>
  )
}
