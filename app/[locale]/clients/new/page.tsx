"use client"

import { AddClientForm } from "@/components/add-client-form"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { ArrowLeft, UserPlus } from "lucide-react"

export default function NewClientPage() {
  const tClients = useTranslations('clients')
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 md:py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="hover:bg-slate-100">
              <a href="/clients">
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </a>
            </Button>
            <div className="flex items-center gap-3">
              <div className="hidden h-10 w-10 rounded-full bg-blue-100 items-center justify-center md:flex">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="hidden text-xl font-semibold text-slate-900 md:block">{tClients('addNewClient')}</h1>
                <p className="text-sm text-slate-500">
                  {tClients('createNewClientProfile')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-24 md:py-6 md:pb-6">
        <AddClientForm />
      </main>
    </div>
  )
}

