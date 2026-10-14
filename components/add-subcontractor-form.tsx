"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AddSubcontractorFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AddSubcontractorForm({ open, onOpenChange, onSuccess }: AddSubcontractorFormProps) {
    const { toast } = useToast()
    const t = useTranslations("crewPage")
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone_number: "",
        company_name: "",
        specialty: "",
        address: "",
        notes: "",
    })

    const handleChange = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) {
            toast({ title: t("nameRequired"), variant: "destructive" })
            return
        }

        try {
            setSaving(true)
            await api.createSubcontractor({
                name: form.name.trim(),
                email: form.email.trim() || undefined,
                phone_number: form.phone_number.trim() || undefined,
                company_name: form.company_name.trim() || undefined,
                specialty: form.specialty.trim() || undefined,
                address: form.address.trim() || undefined,
                notes: form.notes.trim() || undefined,
            })
            toast({ title: t("added") })
            setForm({ name: "", email: "", phone_number: "", company_name: "", specialty: "", address: "", notes: "" })
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            toast({ title: t("addFailed"), description: err.message, variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("addCrewMember")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sub-name">{t("nameLabel")}</Label>
                        <Input
                            id="sub-name"
                            placeholder={t("fullNamePlaceholder")}
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="sub-email">{t("email")}</Label>
                            <Input
                                id="sub-email"
                                type="email"
                                placeholder={t("emailPlaceholder")}
                                value={form.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sub-phone">{t("phone")}</Label>
                            <Input
                                id="sub-phone"
                                placeholder="(555) 123-4567"
                                value={form.phone_number}
                                onChange={(e) => handleChange("phone_number", e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="sub-company">{t("companyName")}</Label>
                            <Input
                                id="sub-company"
                                placeholder={t("companyPlaceholder")}
                                value={form.company_name}
                                onChange={(e) => handleChange("company_name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sub-specialty">{t("specialty")}</Label>
                            <Input
                                id="sub-specialty"
                                placeholder={t("specialtyPlaceholder")}
                                value={form.specialty}
                                onChange={(e) => handleChange("specialty", e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sub-address">{t("address")}</Label>
                        <Input
                            id="sub-address"
                            placeholder={t("streetPlaceholder")}
                            value={form.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sub-notes">{t("notes")}</Label>
                        <Textarea
                            id="sub-notes"
                            placeholder={t("notesPlaceholder")}
                            rows={3}
                            value={form.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? t("saving") : t("addCrewMember")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
