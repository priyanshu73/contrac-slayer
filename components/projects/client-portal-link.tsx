"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Link2, Check } from "lucide-react"

interface ClientPortalLinkProps {
  clientId: number | null | undefined
  existingToken?: string | null
  className?: string
}

export function ClientPortalLink({ clientId, existingToken, className }: ClientPortalLinkProps) {
  const { toast } = useToast()
  const locale = useLocale()
  const [token, setToken] = useState<string | null>(existingToken ?? null)
  const [working, setWorking] = useState(false)
  const [copied, setCopied] = useState(false)

  const buildUrl = (t: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/client/${t}`
      : `/${locale}/client/${t}`

  const handleClick = async () => {
    if (!clientId) {
      toast({ title: "No client linked", description: "Link a client to this project first.", variant: "destructive" })
      return
    }
    try {
      setWorking(true)
      let portalToken = token
      if (!portalToken) {
        const result = await api.generateClientPortal(clientId)
        portalToken = result.token
        setToken(portalToken)
      }
      await navigator.clipboard.writeText(buildUrl(portalToken))
      setCopied(true)
      toast({ title: "Link copied", description: "Client portal URL is ready to share." })
      setTimeout(() => setCopied(false), 2000)
    } catch (err: any) {
      toast({ title: "Failed to copy link", description: err?.message ?? "Please try again.", variant: "destructive" })
    } finally {
      setWorking(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={working || !clientId}
          className={className}
        >
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <Link2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          )}
          {copied ? "Link copied" : "Client Portal Link"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Share this link with your client. They can view all their quotes, proposals, and invoices.
      </TooltipContent>
    </Tooltip>
  )
}
