"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { api } from "@/lib/api"
import type { InviteInfo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthPasswordInput } from "@/app/[locale]/auth/_components/auth-password-input"
import { Users, Loader2, AlertCircle } from "lucide-react"

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const locale = useLocale()
  const token = params.token as string

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api
      .getInvite(token)
      .then(setInfo)
      .catch(() => setInfo({ valid: false }))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setSubmitting(true)
    try {
      await api.acceptInvite(token, fullName.trim(), password)
      // Session cookie is set by the backend; land in the app.
      router.push(`/${locale}/dashboard`)
    } catch (err: any) {
      setError(err.message || "Couldn't accept the invite.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!info?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            {info?.already_accepted ? "Invite already used" : "Invite not valid"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {info?.already_accepted
              ? "This invite has already been accepted. Try logging in instead."
              : "This invite link is invalid or has expired. Ask your team admin to send a new one."}
          </p>
          <Button
            className="mt-6 w-full bg-slate-900 hover:bg-slate-700"
            onClick={() => router.push(`/${locale}/auth/login`)}
          >
            Go to login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Join {info.company_name || "the team"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            You've been invited as {info.invited_email}. Set up your account to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Your name</Label>
            <Input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <AuthPasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-700"
          >
            {submitting ? "Setting up…" : "Join team"}
          </Button>
        </form>
      </div>
    </div>
  )
}
