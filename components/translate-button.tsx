"use client"

import { useState } from "react"
import { Languages, Loader2, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { useLocale, useTranslations } from "next-intl"

interface TranslateButtonProps {
  text: string
  onTranslated: (translatedText: string) => void
  onReset?: () => void
  isTranslated?: boolean
  className?: string
  size?: "sm" | "default" | "lg" | "icon"
  variant?: "ghost" | "outline" | "default" | "secondary"
}

export function TranslateButton({
  text,
  onTranslated,
  onReset,
  isTranslated = false,
  className = "",
  size = "icon",
  variant = "ghost"
}: TranslateButtonProps) {
  const locale = useLocale()
  const t = useTranslations('translation')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show translate button when locale is 'es' (Spanish)
  // This means user is viewing in Spanish and might want to translate English content
  if (locale !== 'es') {
    return null
  }

  // Don't show if there's no text to translate
  if (!text || !text.trim()) {
    return null
  }

  const handleTranslate = async () => {
    if (isTranslated && onReset) {
      // Reset to original
      onReset()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Translate from English to Spanish (user is viewing in Spanish locale)
      const response = await api.translateText(text, 'es', 'en')
      onTranslated(response.translated_text)
    } catch (err: any) {
      console.error('Translation error:', err)
      setError(err.message || 'Translation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleTranslate}
            disabled={isLoading}
            className={`h-6 w-6 p-0 ${isTranslated ? 'text-green-600' : 'text-muted-foreground hover:text-primary'} ${className}`}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isTranslated ? (
              <RotateCcw className="h-3.5 w-3.5" />
            ) : (
              <Languages className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isLoading 
              ? t('translating') 
              : isTranslated 
                ? t('showOriginal') 
                : t('translateToSpanish')
            }
          </p>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Wrapper component for translating a section with state management
interface TranslatableSectionProps {
  originalText: string
  children: (props: { 
    text: string
    isTranslated: boolean
    translateButton: React.ReactNode 
  }) => React.ReactNode
}

export function TranslatableSection({ originalText, children }: TranslatableSectionProps) {
  const [displayText, setDisplayText] = useState(originalText)
  const [isTranslated, setIsTranslated] = useState(false)

  const handleTranslated = (translatedText: string) => {
    setDisplayText(translatedText)
    setIsTranslated(true)
  }

  const handleReset = () => {
    setDisplayText(originalText)
    setIsTranslated(false)
  }

  const translateButton = (
    <TranslateButton
      text={originalText}
      onTranslated={handleTranslated}
      onReset={handleReset}
      isTranslated={isTranslated}
    />
  )

  return <>{children({ text: displayText, isTranslated, translateButton })}</>
}
