"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { Loader2, UserPlus } from "lucide-react"

export type SaveClientAction = "client" | "quote" | "project"

export interface SaveClientFromLeadDialogLead {
    leadId?: number
    name: string
    email?: string
    phone?: string
    address?: string
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    lead: SaveClientFromLeadDialogLead
    defaultAction: SaveClientAction
    onClientSaved: (clientId: number, action: SaveClientAction) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SaveClientFromLeadDialog({
    open,
    onOpenChange,
    lead,
    defaultAction,
    onClientSaved,
}: Props) {
    const { toast } = useToast()
    const t = useTranslations("clients.saveFromLead")

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({})
    const [submittingAction, setSubmittingAction] = useState<SaveClientAction | null>(null)

    useEffect(() => {
        if (open) {
            setName(lead.name || "")
            setEmail(lead.email || "")
            setPhone(lead.phone || "")
            setAddress(lead.address || "")
            setErrors({})
            setSubmittingAction(null)
        }
    }, [open, lead.name, lead.email, lead.phone, lead.address])

    const validate = () => {
        const next: typeof errors = {}
        if (!name.trim() || name.trim().length < 2) {
            next.name = t("nameRequired")
        }
        if (!email.trim()) {
            next.email = t("emailRequired")
        } else if (!EMAIL_RE.test(email.trim())) {
            next.email = t("emailInvalid")
        }
        if (!phone.trim()) {
            next.phone = t("phoneRequired")
        }
        setErrors(next)
        return Object.keys(next).length === 0
    }

    const handleSubmit = async (action: SaveClientAction) => {
        if (!validate()) return

        setSubmittingAction(action)
        try {
            const created = (await api.createClient({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                address: address.trim() || undefined,
            })) as { id?: number } | undefined

            const clientId = created?.id
            if (!clientId) throw new Error(t("notCreated"))

            if (lead.leadId != null) {
                try {
                    await api.updateLead(lead.leadId, {
                        status: "CONVERTED",
                        converted_to_client_id: clientId,
                    })
                } catch {
                    // Client created — lead status sync is best-effort.
                }
            }

            onClientSaved(clientId, action)
            onOpenChange(false)
        } catch (err: any) {
            toast({
                title: t("saveFailed"),
                description: err?.message || t("tryAgain"),
                variant: "destructive",
            })
        } finally {
            setSubmittingAction(null)
        }
    }

    const isBusy = submittingAction !== null

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!isBusy) onOpenChange(next) }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <UserPlus className="h-4 w-4 text-slate-500" />
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="save-client-name">{t("name")}<span className="text-red-500"> *</span></Label>
                        <Input
                            id="save-client-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                            aria-invalid={!!errors.name}
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="save-client-email">{t("email")}<span className="text-red-500"> *</span></Label>
                        <Input
                            id="save-client-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="save-client-phone">{t("phone")}<span className="text-red-500"> *</span></Label>
                        <Input
                            id="save-client-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 555 123 4567"
                            aria-invalid={!!errors.phone}
                        />
                        {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="save-client-address">{t("address")}</Label>
                        <Input
                            id="save-client-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t("addressPlaceholder")}
                        />
                    </div>
                </div>

                <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-col-reverse sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isBusy}
                        onClick={() => void handleSubmit("client")}
                        autoFocus={defaultAction === "client"}
                    >
                        {submittingAction === "client" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("createClient")}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        disabled={isBusy}
                        onClick={() => void handleSubmit("quote")}
                        autoFocus={defaultAction === "quote"}
                    >
                        {submittingAction === "quote" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("createEstimate")}
                    </Button>
                    <Button
                        type="button"
                        className="w-full justify-between"
                        disabled={isBusy}
                        onClick={() => void handleSubmit("project")}
                        autoFocus={defaultAction === "project"}
                    >
                        <span className="inline-flex items-center">
                            {submittingAction === "project" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("createProject")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            {t("recommended")}
                        </span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
