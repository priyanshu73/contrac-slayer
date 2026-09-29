"use client"

import { MobileSectionHub } from "@/components/mobile-section-hub"
import { BriefcaseBusiness, CalendarDays, ListTodo, UsersRound } from "lucide-react"
export default function WorkHub() {
  return <MobileSectionHub title="Work" links={[
    { label: "Projects", subtitle: "Jobs in progress", path: "/projects", icon: BriefcaseBusiness, color: "#F97316", tint: "#FFEDD5" },
    { label: "Tasks", subtitle: "Scheduled across projects", path: "/tasks", icon: ListTodo, color: "#1D4ED8", tint: "#EFF6FF" },
    { label: "Calendar", subtitle: "Availability & bookings", path: "/calendar", icon: CalendarDays, color: "#16A34A", tint: "#DCFCE7" },
    { label: "Crew", subtitle: "Your subcontractors", path: "/crew", icon: UsersRound, color: "#9333EA", tint: "#F3E8FF" },
  ]} />
}
