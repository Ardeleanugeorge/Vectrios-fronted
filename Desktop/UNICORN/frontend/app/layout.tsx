import type { Metadata } from "next"
import Script from "next/script"
import { ThemeProvider } from "@/components/ThemeProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "VectriOS - Strategic Revenue Diagnostic Engine for B2B SaaS",
  description: "Detect structural misalignment between content, ICP, and revenue objective. Measure close rate risk, not impressions.",
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
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Apply dark/light on <html> before React — must match ThemeProvider storageKey + values */}
        <Script
          id="vectrios-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;r.classList.remove("light","dark");var t=localStorage.getItem("vectrios-theme");if(t==="light"){r.classList.add("light")}else{r.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
          }}
        />
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
