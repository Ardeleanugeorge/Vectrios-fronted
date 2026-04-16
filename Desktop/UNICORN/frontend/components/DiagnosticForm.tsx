"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DiagnosticForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    niche: "",
    offer: "",
    ideal_client: "",
    current_close_rate: "",
    target_close_rate: "",
    content_samples: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...form,
        current_close_rate: Number(form.current_close_rate),
        target_close_rate: Number(form.target_close_rate),
        content_samples: form.content_samples
          .split("\n\n")
          .filter(sample => sample.trim().length > 0)
      }

      const res = await apiFetch(`/close-rate-diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      localStorage.setItem("diagnostic_result", JSON.stringify(data))
      router.push("/results")
    } catch (error) {
      console.error("Error submitting diagnostic:", error)
      alert("Error analyzing content. Please try again.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Niche
        </label>
        <input
          name="niche"
          placeholder="e.g., B2B SaaS pricing optimization"
          value={form.niche}
          onChange={handleChange}
          required
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Offer
        </label>
        <input
          name="offer"
          placeholder="e.g., Revenue acceleration sprint"
          value={form.offer}
          onChange={handleChange}
          required
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Ideal Client
        </label>
        <input
          name="ideal_client"
          placeholder="e.g., Series A SaaS founders between $50k-$200k MRR"
          value={form.ideal_client}
          onChange={handleChange}
          required
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Current Close Rate (%)
          </label>
          <input
            name="current_close_rate"
            type="number"
            step="0.1"
            placeholder="18"
            value={form.current_close_rate}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Close Rate (%)
          </label>
          <input
            name="target_close_rate"
            type="number"
            step="0.1"
            placeholder="28"
            value={form.target_close_rate}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Content Samples
        </label>
        <textarea
          name="content_samples"
          placeholder="Paste 1–3 LinkedIn posts or scripts (separate with blank line)"
          value={form.content_samples}
          onChange={handleChange}
          required
          rows={8}
          className="input resize-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          Separate each content sample with a blank line
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium rounded-lg transition"
      >
        {loading ? "Analyzing..." : "Analyze My Close Rate Risk"}
      </button>
    </form>
  )
}
