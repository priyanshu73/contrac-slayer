export default function Head() {
  return (
    <>
      {/* Ensure iOS treats this as a standalone web app with the short name */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="ContractorOps" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    </>
  )
}

