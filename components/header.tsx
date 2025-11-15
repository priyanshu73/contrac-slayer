'use client'

import { Globe, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  language: string
  setLanguage: (lang: string) => void
}

export default function Header({ language, setLanguage }: HeaderProps) {
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en')
  }

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">SL</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Service Lead Dashboard</h1>
            <p className="text-xs text-muted-foreground">Professional Communication Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'English' : 'Español'}
          </Button>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
