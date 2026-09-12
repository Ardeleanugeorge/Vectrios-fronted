"use client"

interface SourceChipProps {
  label: "GA4" | "GSC" | "Model" | "Monitoring";
  title?: string;
  tone?: "emerald" | "cyan" | "indigo" | "gray";
}

export default function SourceChip({ label, title, tone = "gray" }: SourceChipProps) {
  const cls =
    tone === "emerald"
      ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20"
      : tone === "cyan"
      ? "text-cyan-300 bg-cyan-400/10 border-cyan-400/20"
      : tone === "indigo"
      ? "text-indigo-300 bg-indigo-400/10 border-indigo-400/20"
      : "text-gray-300 bg-gray-400/10 border-gray-400/20"
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${cls}`}
      title={title}
    >
      {label}
    </span>
  )
}

