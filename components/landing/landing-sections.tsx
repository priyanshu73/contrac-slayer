"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { animateLandingChat } from "@/lib/landing-chat"
import { LandingSonicDemoCard } from "@/components/landing-sonic-demo-card"
import "./landing.css"
import {
  BENTO_HTML,
  BOB_HTML,
  WORK_HTML,
  RECEP_HTML,
  LEAD_HTML,
  ONLINE_HTML,
  FIN_HTML,
} from "./landing-markup"

/** Plays each example with typing pauses once its conversation is visible. */
function useSequentialChat(ref: React.RefObject<HTMLDivElement | null>) {
  const t = useTranslations("landing")
  useEffect(() => {
    const root = ref.current
    if (!root) return
    return animateLandingChat(root, { ai: t("chatTypingAi"), customer: t("chatTypingCustomer") })
  }, [ref, t])
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US")
const COST_DATA = {
  w: { rev: 12125, direct: 8365, indirect: 903, net: 2857 },
  m: { rev: 48500, direct: 33460, indirect: 3610, net: 11430 },
  q: { rev: 145500, direct: 100380, indirect: 10830, net: 34290 },
} as const

/** Makes the Costs tile toggles work: Financials vs Direct / indirect, and Week / Month / Quarter. */
function useCostToggle(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = ref.current
    const box = root?.querySelector<HTMLElement>(".costv")
    if (!root || !box) return
    let view: "fin" | "di" = "di"
    let per: "w" | "m" | "q" = "m"
    const render = () => {
      const d = COST_DATA[per]
      const costs = d.direct + d.indirect
      const bar = box.querySelector<HTMLElement>(".bar")
      const dl = box.querySelector<HTMLElement>(".dl")
      const net = box.querySelector<HTMLElement>("[data-net]")
      if (!bar || !dl || !net) return
      const col = (c: string, label: string, sub: string, val: number) =>
        `<div><span style="--c:${c}">${label}</span><small>${sub}</small><b>${fmt(val)}</b></div>`
      if (view === "di") {
        const dp = Math.round((d.direct / costs) * 100)
        bar.innerHTML = `<i style="width:${dp}%;background:#0b66d4"></i><i style="width:${100 - dp}%;background:#7aa9e6"></i>`
        dl.innerHTML =
          col("#0b66d4", "Direct", "Crew, materials", d.direct) +
          col("#7aa9e6", "Indirect", "Insurance, trucks, software", d.indirect)
      } else {
        const cp = Math.round((costs / d.rev) * 100)
        bar.innerHTML = `<i style="width:${cp}%;background:#0b66d4"></i><i style="width:${100 - cp}%;background:#7aa9e6"></i>`
        dl.innerHTML =
          col("#0b66d4", "Costs", "Direct plus indirect", costs) +
          col("#7aa9e6", "Revenue", "Quoted and billed", d.rev)
      }
      net.textContent = fmt(d.net)
      box.querySelectorAll<HTMLElement>("[data-view]").forEach((el) => {
        const on = el.dataset.view === view
        el.classList.toggle("on", on)
        el.setAttribute("aria-pressed", String(on))
      })
      box.querySelectorAll<HTMLElement>("[data-per]").forEach((el) => {
        const on = el.dataset.per === per
        el.classList.toggle("on", on)
        el.setAttribute("aria-pressed", String(on))
      })
    }
    const act = (el: HTMLElement | null) => {
      if (!el) return
      if (el.dataset.view) view = el.dataset.view as "fin" | "di"
      else if (el.dataset.per) per = el.dataset.per as "w" | "m" | "q"
      else return
      render()
    }
    const onClick = (e: Event) => act((e.target as HTMLElement).closest<HTMLElement>("[data-view],[data-per]"))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        act((e.target as HTMLElement).closest<HTMLElement>("[data-view],[data-per]"))
      }
    }
    box.addEventListener("click", onClick)
    box.addEventListener("keydown", onKey)
    return () => {
      box.removeEventListener("click", onClick)
      box.removeEventListener("keydown", onKey)
    }
  }, [ref])
}

function Block({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useSequentialChat(ref)
  useCostToggle(ref)
  return <div className="lp" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}

export const LandingBento = () => <Block html={BENTO_HTML} />
export const LandingBob = () => <Block html={BOB_HTML} />
export const LandingWorkspace = () => <Block html={WORK_HTML} />
export const LandingLead = () => <Block html={LEAD_HTML} />
export const LandingOnline = () => <Block html={ONLINE_HTML} />
export const LandingFinalCta = () => <Block html={FIN_HTML} />

export function LandingReceptionist() {
  const [open, setOpen] = useState(false)
  const seqRef = useRef<HTMLDivElement>(null)
  useSequentialChat(seqRef)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <div
        className="lp"
        ref={seqRef}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-demo]")) setOpen(true)
        }}
        dangerouslySetInnerHTML={{ __html: RECEP_HTML }}
      />
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"
            >
              <X className="h-4 w-4" />
            </button>
            <LandingSonicDemoCard />
          </div>
        </div>
      )}
    </>
  )
}
