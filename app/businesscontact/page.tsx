import Image from 'next/image'
import { ArrowUpRight, CalendarDays, QrCode } from 'lucide-react'
import QRCode from 'qrcode'

const BOOKING_URL = 'https://cal.com/johnson-subedi/30min'

export const metadata = {
  title: 'ContractorOps | Book a demo',
  description: 'Scan the ContractorOps business card QR code to book a demo.',
}

export default async function BusinessContactPage() {
  const qrDataUrl = await QRCode.toDataURL(BOOKING_URL, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 640,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })

  return (
    <main className="min-h-screen bg-[#eef2f7] px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] md:grid-cols-[1fr_360px]">
          <div className="flex flex-col justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-7 py-10 text-white sm:px-12 sm:py-14">
            <div className="mb-10 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Image src="/logo.png" alt="ContractorOps" width={34} height={34} className="rounded-lg object-contain" />
              </span>
              <span className="text-lg font-bold tracking-tight">ContractorOps</span>
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Business card</p>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Run the job, not the chaos.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              See how ContractorOps helps contractors capture leads, organize work, and keep every client conversation moving.
            </p>

            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
            >
              Book a demo
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="flex flex-col items-center justify-center px-7 py-10 text-center sm:px-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              <QrCode className="h-4 w-4" />
              Scan to connect
            </div>
            <div className="rounded-[1.5rem] border-2 border-blue-600 bg-white p-4 shadow-[0_12px_30px_rgba(37,99,235,0.18)]">
              <Image
                src={qrDataUrl}
                alt="QR code linking to the ContractorOps demo booking page"
                width={280}
                height={280}
                unoptimized
                className="h-auto w-[min(68vw,280px)]"
              />
            </div>
            <p className="mt-6 text-lg font-semibold text-slate-900">Book a ContractorOps demo</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Opens Cal.com scheduling
            </p>
            <p className="mt-4 break-all text-xs text-slate-400">{BOOKING_URL}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
