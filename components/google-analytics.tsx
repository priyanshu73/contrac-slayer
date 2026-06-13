"use client"

import Script from "next/script"
import { useEffect, useState } from "react"

const GA_ID = "G-JGC2GQW227"
// Only the real production site should report to GA. Matches the prod-host check
// used elsewhere (e.g. the QuickBooks gate) so localhost, dev, and preview
// deploys never pollute analytics.
const PROD_HOSTS = ["contractorops.ai", "www.contractorops.ai"]

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // Decide after mount so server render + hydration both produce nothing
    // (no mismatch); the tag is injected only on the prod hostname in-browser.
    setEnabled(PROD_HOSTS.includes(window.location.hostname))
  }, [])

  if (!enabled) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
