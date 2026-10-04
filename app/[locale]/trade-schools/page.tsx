import { Header } from '@/components/header'
import { TradeSchools } from '@/components/trade-schools'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/trade-schools/en.json'
import es from '@/messages/trade-schools/es.json'
import './trade-schools.css'

type PageProps = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const copy = locale === 'es' ? es : en
  return { title: copy.title, description: copy.description }
}

export default async function TradeSchoolsPage({ params }: PageProps) {
  const { locale } = await params
  return <main className="trade-school-page"><Header /><NextIntlClientProvider locale={locale} messages={{ tradeSchools: locale === 'es' ? es : en }}><TradeSchools /></NextIntlClientProvider></main>
}
