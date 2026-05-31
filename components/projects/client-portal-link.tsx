"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Link2, Copy, Check, ExternalLink } from "lucide-react"

interface ClientPortalLinkProps {
  clientId: number | null | undefined
  existingToken?: string | null
}

export function ClientPortalLink({ clientId, existingToken }: ClientPortalLinkProps) {
  const { toast } = useToast()
  const locale = useLocale()
  const [token, setToken] = useState<string | null>(existingToken ?? null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const portalUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/client/${token}`
      : token
      ? `/${locale}/client/${token}`
      : null

  const handleGenerate = async () => {
    if (!clientId) {
      toast({ title: "No client linked", description: "Link a client to this project first.", variant: "destructive" })
      return
    }
    try {
      setGenerating(true)
      const result = await api.generateClientPortal(clientId)
      setToken(result.token)
      toast({ title: "Client portal link ready", description: "Share this link with your client." })
    } catch (err: any) {
      toast({ title: "Failed to generate link", description: err?.message ?? "Please try again.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast({ title: "Link copied", description: "Client portal URL is ready to share." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Failed to copy", description: "Please copy the link manually.", variant: "destructive" })
    }
  }

  return (
    <Card className="p-4 w-full border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-slate-50/50">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Client Portal</h3>
        </div>

        {!portalUrl ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Generate a single link your client can open to view all their quotes, proposals, and invoices.
            </p>
            <Button onClick={handleGenerate} disabled={generating || !clientId} className="w-full">
              {generating ? "Generating…" : clientId ? "Generate Client Portal Link" : "No client linked"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Share this link with your client. They can view all their quotes, proposals, and invoices without logging in.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200 font-mono text-xs break-all leading-relaxed">
                {portalUrl}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button onClick={handleCopy} variant="outline" size="icon" className="h-9 w-9" title="Copy link">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Open portal">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              {generating ? "Regenerating…" : "Regenerate link"}
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
