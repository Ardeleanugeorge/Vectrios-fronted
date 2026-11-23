import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "VectriOS — Structural messaging monitoring for B2B SaaS",
  description: "VectriOS reads your site and up to 5 competitors every night, scores each against 500+ SaaS websites, and reports confirmed homepage headline changes. For B2B SaaS marketing teams. $299/month, 14-day free trial.",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaMeasurementId = "G-XNDSXESP08"

  return (
    <html lang="en" className="dark">
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}');
          `}
        </Script>
        {children}
      </body>
    </html>
  )
}
