"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLocale } from "next-intl"
import { api } from "@/lib/api"
import type { TeamMember } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Users, Mail, Copy, Check, Trash2, Crown, Shield, Clock } from "lucide-react"

function RoleBadge({ role }: { role: TeamMember["role"] }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <Crown className="h-3 w-3" /> Owner
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      <Shield className="h-3 w-3" /> {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  )
}

export function TeamSettings() {
  const { toast } = useToast()
  const locale = useLocale()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const buildInviteUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/invite/${token}`

  const load = async () => {
    try {
      const data = await api.listTeamMembers()
      setMembers(data)
    } catch (err: any) {
      toast({ title: "Couldn't load team", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setInviting(true)
    try {
      // Pass the current origin+locale so the emailed link uses the right host.
      const base = typeof window !== "undefined" ? `${window.location.origin}/${locale}` : undefined
      const res = await api.inviteTeamMember(trimmed, "ADMIN", base)
      setLastInviteUrl(buildInviteUrl(res.invite_token))
      setCopied(false)
      setEmail("")
      toast({ title: "Invite sent", description: `We emailed an invite to ${trimmed}. You can also copy the link below.` })
      load()
    } catch (err: any) {
      toast({ title: "Couldn't send invite", description: err.message, variant: "destructive" })
    } finally {
      setInviting(false)
    }
  }

  const copyLink = async () => {
    if (!lastInviteUrl) return
    try {
      await navigator.clipboard.writeText(lastInviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" })
    }
  }

  const copyInviteLink = async (member: TeamMember) => {
    if (!member.invite_token) return
    try {
      await navigator.clipboard.writeText(buildInviteUrl(member.invite_token))
      setCopiedId(member.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast({ title: "Copy failed", description: "Copy the link manually.", variant: "destructive" })
    }
  }

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.full_name || member.invited_email} from the team?`)) return
    try {
      await api.removeTeamMember(member.id)
      toast({ title: "Removed" })
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    } catch (err: any) {
      toast({ title: "Couldn't remove", description: err.message, variant: "destructive" })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Team members</h2>
            <p className="text-xs text-slate-500">Invite people to your account. They get full access.</p>
          </div>
        </div>

        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              required
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={inviting} className="bg-slate-900 hover:bg-slate-700">
            {inviting ? "Inviting…" : "Invite"}
          </Button>
        </form>

        {/* Generated invite link */}
        {lastInviteUrl && (
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
            <p className="text-xs font-medium text-slate-700 mb-1.5">Invite link — share it with your teammate:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-[11px] text-slate-600 border border-slate-200">
                {lastInviteUrl}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-1.5">
          {loading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No team members yet.</p>
          ) : (
            members.map((m) => {
              const pending = m.status === "INVITED"
              const name = m.full_name || m.invited_email || "Pending invite"
              // Only show the sub-line once the member has accepted (has a real
              // name); for pending invites the name line already is the email.
              const subline = m.full_name ? (m.email || m.invited_email) : null
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{name}</span>
                      {m.is_you && <span className="text-[10px] text-slate-400">(you)</span>}
                    </div>
                    {subline && <div className="truncate text-xs text-slate-500">{subline}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pending ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">
                          <Clock className="h-3 w-3" /> Invited
                        </span>
                        {m.invite_token && (
                          <button
                            onClick={() => copyInviteLink(m)}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800"
                            title="Copy invite link"
                          >
                            {copiedId === m.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === m.id ? "Copied" : "Copy link"}
                          </button>
                        )}
                      </>
                    ) : (
                      <RoleBadge role={m.role} />
                    )}
                    {m.role !== "OWNER" && !m.is_you && (
                      <button
                        onClick={() => handleRemove(m)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
