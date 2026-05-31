import fs from "node:fs/promises"
import path from "node:path"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { PreviewTabs, type PreviewEntry } from "./preview-tabs"

// Hosts that are always allowed (you'd never deploy these as prod).
const ALWAYS_ALLOWED_HOST_PATTERNS = [
  /^localhost(:\d+)?$/i,
  /^127\.0\.0\.1(:\d+)?$/i,
  /\.local(:\d+)?$/i,
]

// Hosts containing any of these tokens are treated as dev/staging/preview.
const DEV_HOST_TOKENS = ["dev.", "staging.", "preview.", "-dev", "-staging", "-preview"]

function isAllowedHost(host: string | null): boolean {
  if (!host) return false
  if (ALWAYS_ALLOWED_HOST_PATTERNS.some((re) => re.test(host))) return true
  if (DEV_HOST_TOKENS.some((token) => host.toLowerCase().includes(token))) return true
  // Vercel preview deployments end in .vercel.app (production custom domains don't).
  if (host.endsWith(".vercel.app")) return true
  return false
}

function isAllowedByEnv(): boolean {
  // Explicit opt-in for any deploy that doesn't match a host heuristic.
  return process.env.ALLOW_DEV_PREVIEW === "true"
}

async function loadPreviewEntries(): Promise<{ entries: PreviewEntry[]; prompt: string }> {
  const previewDir = path.join(process.cwd(), "public", "dev", "preview")
  const files = await fs.readdir(previewDir)

  const htmlFiles = files
    .filter((name) => name.endsWith(".html") && name.startsWith("estimate-"))
    .sort()

  const entries: PreviewEntry[] = htmlFiles.map((filename) => {
    const model = filename.replace(/^estimate-/, "").replace(/\.html$/, "")
    return { model, src: `/dev/preview/${filename}` }
  })

  let prompt = ""
  try {
    prompt = await fs.readFile(path.join(previewDir, "prompt.md"), "utf-8")
  } catch {
    prompt = ""
  }
  return { entries, prompt }
}

export default async function DevPreviewPage() {
  const hdrs = await headers()
  const host = hdrs.get("host")

  if (!isAllowedHost(host) && !isAllowedByEnv()) {
    // Behave like the route doesn't exist on prod — no hints in error pages.
    notFound()
  }

  const { entries, prompt } = await loadPreviewEntries()

  if (entries.length === 0) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Dev preview</h1>
        <p style={{ color: "#64748b", marginTop: 8 }}>
          No previews found under <code>public/dev/preview/</code>. Run{" "}
          <code>docker compose run --rm web python dev/render_estimate_html.py --models …</code>{" "}
          in the backend and copy the outputs over.
        </p>
      </div>
    )
  }

  return <PreviewTabs entries={entries} prompt={prompt} host={host ?? ""} />
}

// Always render on demand — file list and gate must be fresh on every hit.
export const dynamic = "force-dynamic"
