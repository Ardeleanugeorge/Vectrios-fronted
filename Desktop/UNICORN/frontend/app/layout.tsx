import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import { CATEGORY, SUBHEADLINE } from "@/config/messaging"

export const metadata: Metadata = {
  title: `VectriOS — ${CATEGORY}`,
  description: `${SUBHEADLINE} $299/month, 14-day free trial.`,
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
