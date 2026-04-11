import DiagnosticForm from "@/components/DiagnosticForm"

export default function DiagnosticPage() {
  return (
    <main className="page-root p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold mb-2">Close Rate Diagnostic</h2>
        <p className="text-gray-400 mb-8">
          Analyze your content to identify revenue leaks in your conversion system.
        </p>
        <DiagnosticForm />
      </div>
    </main>
  )
}
