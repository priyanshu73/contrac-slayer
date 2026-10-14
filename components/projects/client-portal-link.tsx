"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
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
  const tpl = useTranslations('projectsPage.financials.portal')
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
      toast({ title: tpl('noClient'), description: tpl('linkClientFirst'), variant: "destructive" })
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
      const portalUrl = buildUrl(portalToken)
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast({
        title: tpl('linkCopied'),
        description: tpl('portalReady'),
        className: "max-w-xs p-3 pr-8",
        action: (
          <ToastAction altText={tpl('previewAria')} className="h-7 px-2" onClick={() => window.open(portalUrl, "_blank", "noopener,noreferrer")}>
            {tpl('preview')}
          </ToastAction>
        ),
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err: any) {
      toast({ title: tpl('copyFailed'), description: err?.message ?? tpl('tryAgain'), variant: "destructive" })
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
          {copied ? tpl('linkCopied') : tpl('portalLink')}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {tpl('tooltip')}
      </TooltipContent>
    </Tooltip>
  )
}
