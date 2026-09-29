"use client"

import { MobileSectionHub } from "@/components/mobile-section-hub"
import { BarChart3, FileText, Receipt, UserRoundPlus, UsersRound } from "lucide-react"
export default function SalesHub() {
  return <MobileSectionHub title="Sales" links={[
    { label: "Leads", subtitle: "Inbound prospects", path: "/leads", icon: UserRoundPlus, color: "#16A34A", tint: "#DCFCE7" },
    { label: "Quotes", subtitle: "Deals in your pipeline", path: "/quotes", icon: FileText, color: "#1D4ED8", tint: "#EFF6FF" },
    { label: "Clients", subtitle: "Your customers", path: "/clients", icon: UsersRound, color: "#9333EA", tint: "#F3E8FF" },
    { label: "Invoices", subtitle: "Billing & payments", path: "/invoices", icon: Receipt, color: "#F97316", tint: "#FFEDD5" },
    { label: "Reports", subtitle: "Sales & money performance", path: "/reports", icon: BarChart3, color: "#16A34A", tint: "#DCFCE7" },
  ]} />
}
