import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import { EnterpriseV2 } from "@/components/enterprise-v2"
import "./enterprise-v2.css"

export const metadata = {
  title: "Enterprise | ContractorOps",
  description:
    "ContractorOps for multi-location contractors, PE-backed platforms, and franchisors: answer and book more calls across every location, connected to the systems you already run.",
}

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />
      <EnterpriseV2 />
      <LandingFooter />
    </main>
  )
}
