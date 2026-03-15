"use client"

import { API_URL } from '@/lib/config'

import { useState } from "react"

export default function ApplyPage() {
  const [currentSection, setCurrentSection] = useState(1)
  const [form, setForm] = useState({
    company_name: "",
    website_url: "",
    arr_range: "",
    team_size: "",
    growth_model: "",
    close_rate: "",
    sales_cycle: "",
    icp_description: "",
    revenue_objective: "",
    close_rate_stagnation: "",
    content_channels: [] as string[],
    content_urls: "",
    why_applying: ""
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const totalSections = 5

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckbox = (channel: string) => {
    setForm(prev => ({
      ...prev,
      content_channels: prev.content_channels.includes(channel)
        ? prev.content_channels.filter(c => c !== channel)
        : [...prev.content_channels, channel]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Get qualification token from sessionStorage
    const qualificationToken = sessionStorage.getItem("qualification_token")
    if (!qualificationToken) {
      alert("Please complete qualification first.")
      window.location.href = "/qualify"
      return
    }

    try {
      const response = await fetch(`${API_URL}/diagnostic-application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          content_urls: form.content_urls.split("\n").filter(url => url.trim()),
          content_owner: "founder", // Default, can be adjusted
          qualification_token: qualificationToken
        })
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const error = await response.json()
        alert(error.detail || "Error submitting application. Please try again.")
      }
    } catch (error) {
      alert("Error submitting application. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentSection) {
      case 1:
        return form.company_name && form.website_url && form.arr_range && form.team_size
      case 2:
        return form.growth_model
      case 3:
        return form.icp_description && form.revenue_objective && form.close_rate_stagnation
      case 4:
        return form.content_channels.length > 0 && form.content_urls.split("\n").filter(url => url.trim()).length >= 3
      case 5:
        return form.why_applying.length > 50
      default:
        return false
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold mb-6">Application Received</h1>
          <p className="text-xl text-gray-300 mb-4">
            We've received your diagnostic application.
          </p>
          <p className="text-lg text-gray-400 mb-6">
            Our team will review your submission and respond within 3–5 business days.
          </p>
          <a href="/" className="text-cyan-400 hover:text-cyan-300">
            Return to homepage
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-3xl mx-auto px-6">
        {/* HERO SECTION */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Apply for Strategic Revenue Diagnostic
          </h1>
          <p className="text-xl text-gray-400 mb-6 leading-relaxed">
            VectriOS runs a structural revenue scan for qualified B2B SaaS teams.
          </p>
          <p className="text-lg text-gray-500 mb-4">
            This is not an automated content audit.
            <br />
            Each diagnostic is reviewed before delivery.
          </p>
          <p className="text-sm text-gray-600">
            We currently onboard a limited number of companies per cycle.
          </p>
        </div>

        {/* PROGRESS INDICATOR */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4, 5].map((section) => (
              <div key={section} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    section < currentSection
                      ? "bg-cyan-500 text-black"
                      : section === currentSection
                      ? "bg-cyan-500 text-black"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {section}
                </div>
                {section < totalSections && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      section < currentSection ? "bg-cyan-500" : "bg-gray-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center">
            Estimated time: 6–8 minutes
          </p>
        </div>

        {/* EXPECTATION SETTING */}
        {currentSection === 1 && (
          <div className="mb-12 space-y-8 border-t border-gray-800 pt-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">What This Diagnostic Is</h2>
              <ul className="space-y-2 text-gray-300">
                <li>• A structural revenue risk analysis</li>
                <li>• A close-rate impact assessment</li>
                <li>• A strategic alignment evaluation</li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">What This Is Not</h2>
              <ul className="space-y-2 text-gray-500">
                <li>• A content critique</li>
                <li>• A style review</li>
                <li>• A marketing audit</li>
              </ul>
            </div>
            <p className="text-lg text-gray-400 italic">
              We evaluate how your content architecture affects revenue performance.
            </p>
          </div>
        )}

        {/* WHO SHOULD APPLY */}
        {currentSection === 1 && (
          <div className="mb-12 border-t border-gray-800 pt-8">
            <h2 className="text-2xl font-bold mb-6">Who Should Apply</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-cyan-400">This is a fit if:</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>• You are a B2B SaaS company</li>
                  <li>• You have an active sales motion</li>
                  <li>• You publish content consistently</li>
                  <li>• Close rate matters to your growth strategy</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-500">This is not a fit if:</h3>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li>• You are pre-revenue without sales</li>
                  <li>• You rely purely on self-serve PLG</li>
                  <li>• You are an agency offering services</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Company Context */}
          {currentSection === 1 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Company Context</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Company Name *</label>
                <input
                  type="text"
                  name="company_name"
                  required
                  value={form.company_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website URL *</label>
                <input
                  type="url"
                  name="website_url"
                  required
                  value={form.website_url}
                  onChange={handleChange}
                  className="input"
                  placeholder="https://yourcompany.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We analyze public-facing content architecture.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ARR Range *</label>
                <select
                  name="arr_range"
                  required
                  value={form.arr_range}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select ARR range</option>
                  <option value="pre-revenue">Pre-revenue</option>
                  <option value="<500k">&lt; $500k</option>
                  <option value="500k-2M">$500k–$2M</option>
                  <option value="2M-10M">$2M–$10M</option>
                  <option value="10M+">$10M+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Team Size *</label>
                <select
                  name="team_size"
                  required
                  value={form.team_size}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select team size</option>
                  <option value="1-5">1–5</option>
                  <option value="6-20">6–20</option>
                  <option value="21-50">21–50</option>
                  <option value="50+">50+</option>
                </select>
              </div>
            </section>
          )}

          {/* SECTION 2: Revenue Structure */}
          {currentSection === 2 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Revenue Structure</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Primary Growth Model *</label>
                <select
                  name="growth_model"
                  required
                  value={form.growth_model}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select growth model</option>
                  <option value="sales-led">Sales-led</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="plg-with-sales">PLG with sales assist</option>
                  <option value="pure-plg">Pure PLG</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Current Close Rate</label>
                <input
                  type="text"
                  name="close_rate"
                  value={form.close_rate}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 18% or leave blank"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If unknown, estimate.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Average Sales Cycle Length</label>
                <input
                  type="text"
                  name="sales_cycle"
                  value={form.sales_cycle}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., 45 days, 3 months"
                />
              </div>
            </section>
          )}

          {/* SECTION 3: Strategic Alignment */}
          {currentSection === 3 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Strategic Alignment</h2>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Define your ICP in 1–2 sentences *
                </label>
                <textarea
                  name="icp_description"
                  required
                  value={form.icp_description}
                  onChange={handleChange}
                  className="input h-32"
                  placeholder="e.g., Series A SaaS founders between $50k-$200k MRR who struggle with pricing-stage conversions"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specificity matters. Broad market descriptions reduce diagnostic accuracy.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Primary Revenue Objective (Next 6 Months) *</label>
                <select
                  name="revenue_objective"
                  required
                  value={form.revenue_objective}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select objective</option>
                  <option value="improve-close-rate">Improve close rate</option>
                  <option value="pipeline-quality">Improve pipeline quality</option>
                  <option value="shorten-cycle">Shorten sales cycle</option>
                  <option value="increase-acv">Increase ACV</option>
                  <option value="not-defined">Not clearly defined</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Have you experienced close rate stagnation in the past 6 months? *
                </label>
                <select
                  name="close_rate_stagnation"
                  required
                  value={form.close_rate_stagnation}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select answer</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Unsure</option>
                </select>
              </div>
            </section>
          )}

          {/* SECTION 4: Content Inputs */}
          {currentSection === 4 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Content Inputs</h2>
              <div>
                <label className="block text-sm font-medium mb-3">Primary Content Channels *</label>
                <div className="space-y-2">
                  {["LinkedIn", "Blog", "Founder posts", "Newsletter", "Podcast", "Other"].map(channel => (
                    <label key={channel} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.content_channels.includes(channel)}
                        onChange={() => handleCheckbox(channel)}
                        className="mr-3 w-4 h-4"
                      />
                      <span>{channel}</span>
                    </label>
                  ))}
                </div>
                {form.content_channels.length === 0 && (
                  <p className="text-sm text-red-400 mt-2">Select at least one channel</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Provide at least 3 URLs to recent content *
                </label>
                <textarea
                  name="content_urls"
                  required
                  value={form.content_urls}
                  onChange={handleChange}
                  className="input h-32"
                  placeholder="Paste URLs, one per line:&#10;https://linkedin.com/posts/...&#10;https://yourblog.com/post/...&#10;https://..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {form.content_urls.split("\n").filter(url => url.trim()).length} URLs provided
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  The diagnostic requires sufficient signal volume.
                </p>
              </div>
            </section>
          )}

          {/* SECTION 5: Intent Filter */}
          {currentSection === 5 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Intent Filter</h2>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Why are you applying for this diagnostic? *
                </label>
                <textarea
                  name="why_applying"
                  required
                  value={form.why_applying}
                  onChange={handleChange}
                  className="input h-40"
                  placeholder="This helps us understand your strategic intent and ensures we work with companies that are serious about revenue alignment."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is your seriousness filter. {form.why_applying.length}/50 minimum characters.
                </p>
                {form.why_applying.length > 0 && form.why_applying.length < 50 && (
                  <p className="text-sm text-red-400 mt-1">
                    Please provide more detail (minimum 50 characters)
                  </p>
                )}
              </div>
            </section>
          )}

          {/* WHAT HAPPENS NEXT (only on last section) */}
          {currentSection === 5 && (
            <div className="mb-8 border-t border-gray-800 pt-8">
              <h2 className="text-2xl font-bold mb-4">What Happens Next</h2>
              <ul className="space-y-3 text-gray-300">
                <li>• We run a structural scan using our diagnostic engine</li>
                <li>• Findings are reviewed internally</li>
                <li>• You receive a preliminary risk assessment</li>
                <li>• If relevant, we schedule a strategic review call</li>
              </ul>
              <p className="mt-4 text-gray-400">
                Turnaround time: 3–5 business days.
              </p>
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-800">
            {currentSection > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentSection(currentSection - 1)}
                className="px-8 py-3 border border-gray-700 hover:border-gray-600 text-gray-300 font-medium rounded-lg transition"
              >
                Previous
              </button>
            ) : (
              <div></div>
            )}
            
            {currentSection < totalSections ? (
              <button
                type="button"
                onClick={() => {
                  if (canProceed()) {
                    setCurrentSection(currentSection + 1)
                  }
                }}
                disabled={!canProceed()}
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !canProceed()}
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>

          <p className="mt-6 text-sm text-gray-500 text-center">
            Applications are reviewed manually.
            <br />
            Not all submissions are accepted.
          </p>
        </form>
      </div>
    </main>
  )
}
