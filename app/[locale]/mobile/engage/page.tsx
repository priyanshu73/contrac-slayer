"use client"

import { MobileSectionHub } from "@/components/mobile-section-hub"
import { Headphones, Megaphone } from "lucide-react"
export default function EngageHub() {
  return <MobileSectionHub title="Customer Engagement" links={[
    { label: "Lead Generator", subtitle: "Outbound campaigns & staged leads", path: "/lead-generator-agent", icon: Megaphone, color: "#16A34A", tint: "#DCFCE7" },
    { label: "Frontline", subtitle: "Voice & SMS assistant", path: "/frontline", icon: Headphones, color: "#9333EA", tint: "#F3E8FF" },
  ]} />
}
