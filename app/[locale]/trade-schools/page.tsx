import { Header } from "@/components/header"
import { TradeSchools } from "@/components/trade-schools"
import { getTranslations } from "next-intl/server"
import "./trade-schools.css"

export async function generateMetadata() {
  const t = await getTranslations("tradeSchools")
  return { title: t("title"), description: t("description") }
}

export default function TradeSchoolsPage() {
  return <main className="trade-school-page"><Header /><TradeSchools /></main>
}
