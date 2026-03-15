import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VectriOS - Strategic Revenue Diagnostic Engine for B2B SaaS",
  description: "Detect structural misalignment between content, ICP, and revenue objective. Measure close rate risk, not impressions.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
