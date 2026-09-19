"use client"

import Link from "next/link"
import { useState } from "react"
import { useLocale } from "next-intl"
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DeleteAccountPage() {
  const locale = useLocale()
  const { user, loading, logout } = useAuth()
  const [confirmation, setConfirmation] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [deleted, setDeleted] = useState(false)

  const deleteAccount = async () => {
    setError("")
    setSubmitting(true)
    try {
      await api.deleteAccount()
      await logout()
      setDeleted(true)
    } catch (err: any) {
      setError(err?.message || "We could not delete your account. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (deleted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12">
        <section className="w-full rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Account deleted</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your ContractorOps account and associated workspace data have been permanently deleted.</p>
          <Link className="mt-6 inline-block text-sm font-semibold text-slate-950 underline" href={`/${locale}`}>Return to ContractorOps</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-red-50 p-2"><Trash2 className="h-5 w-5 text-red-700" /></span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Delete your ContractorOps account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">You can request deletion here without reinstalling the mobile app.</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-950">What is deleted</p>
          <p className="mt-1">Your account, contractor workspace, projects, quotes, clients, messages, connected-workspace records, and uploads stored for that workspace are permanently removed.</p>
          <p className="mt-3"><span className="font-semibold text-slate-950">Billing:</span> An active ContractorOps subscription is canceled when deletion completes. Keep any invoices or records you need before continuing.</p>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Checking your sign-in status…</p>
        ) : !user ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><p className="text-sm leading-6 text-amber-900">To protect your data, sign in to the account you want to delete.</p></div>
            <Link href={`/${locale}/auth/login?next=/${locale}/delete-account`} className="mt-4 inline-block rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Sign in to continue</Link>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-slate-600">Signed in as <span className="font-semibold text-slate-950">{user.email}</span>.</p>
            <div className="mt-5 space-y-2">
              <Label htmlFor="confirmation">Type DELETE to confirm</Label>
              <Input id="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
            </div>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <Button variant="destructive" className="mt-5" disabled={confirmation !== "DELETE" || submitting} onClick={deleteAccount}>
              {submitting ? "Deleting account…" : "Permanently delete account"}
            </Button>
          </div>
        )}

        <p className="mt-8 text-xs leading-5 text-slate-500">Need help accessing your account? Contact <a className="underline" href="mailto:privacy@contractorops.ai">privacy@contractorops.ai</a>.</p>
      </section>
    </main>
  )
}
