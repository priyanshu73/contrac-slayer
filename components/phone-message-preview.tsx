"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowUp, BatteryFull, Camera, ChevronLeft, Mic, Plus, Signal, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  role: "ai" | "client"
  text: string
  link?: string
}

function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-[18px] bg-[#E9E9EB] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8E8E93]"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </div>
  )
}

const STEP_DELAYS = [3000, 2600, 3000, 16000]

export function PhoneMessagePreview({ className }: { className?: string }) {
  const t = useTranslations("landing")
  const messages = useMemo<Message[]>(
    () => [
      {
        id: "intro",
        role: "ai",
        text: t("phoneBubble1"),
        link: t("phoneUploadLink"),
      },
      {
        id: "upload",
        role: "client",
        text: t("phoneBubble2"),
      },
      {
        id: "booking",
        role: "ai",
        text: t("phoneBubble3"),
        link: t("phoneBookingLink"),
      },
      {
        id: "confirm",
        role: "ai",
        text: t("phoneBubble4"),
      },
    ],
    [t],
  )

  const [visibleCount, setVisibleCount] = useState(1)

  useEffect(() => {
    const delay = STEP_DELAYS[Math.min(visibleCount - 1, STEP_DELAYS.length - 1)]
    const timeout = window.setTimeout(() => {
      setVisibleCount((count) => (count >= messages.length ? 1 : count + 1))
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [messages.length, visibleCount])

  const nextMessage = messages[visibleCount]
  const showTyping = nextMessage?.role === "ai"

  return (
    <div className={cn("relative mx-auto w-[272px] sm:w-[296px] md:w-[324px]", className)}>
      <div className="absolute -right-1 top-28 h-16 w-1 rounded-r-full bg-[#2d3946]" />
      <div className="absolute -left-1 top-24 h-10 w-1 rounded-l-full bg-[#2d3946]" />
      <div className="absolute -left-1 top-40 h-14 w-1 rounded-l-full bg-[#2d3946]" />
      <div className="relative rounded-[2.85rem] border-[8px] border-[#26313d] bg-[#26313d] p-1.5 shadow-[0_30px_86px_rgba(38,49,61,0.20)] ring-1 ring-black/10 sm:p-2">
        <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] ring-1 ring-white/10" />
        <div className="absolute left-1/2 top-0 z-30 h-6 w-24 -translate-x-1/2 rounded-b-[1rem] bg-[#26313d]" />

        <div className="relative aspect-[9/19] min-h-[452px] overflow-hidden rounded-[2rem] bg-[#F7F7F8]">
          <div className="flex h-8 items-center justify-between px-5 pt-2 text-[12px] font-semibold text-[#111827]">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal className="h-3.5 w-3.5 fill-current" />
              <Wifi className="h-3.5 w-3.5" />
              <BatteryFull className="h-4 w-4" />
            </div>
          </div>

          <div className="border-b border-[#D1D1D6]/80 bg-[#F7F7F8]/95 px-3 pb-2 pt-1 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <button className="flex min-w-[76px] items-center gap-0.5 text-[16px] font-medium text-[#007AFF]" aria-label="Back to messages">
                <ChevronLeft className="h-5 w-5" />
                {t("phoneMessages")}
              </button>
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-slate-100 to-slate-300 text-[12px] font-bold text-slate-700 shadow-inner">
                  AI
                </div>
                <span className="mt-1 max-w-[140px] truncate text-[12px] font-semibold text-[#1C1C1E]">
                  {t("phoneAppName")}
                </span>
              </div>
              <div className="min-w-[76px]" />
            </div>
          </div>

          <div className="space-y-2.5 px-3 py-4 pb-24">
            <div className="pb-1 text-center text-[11px] font-semibold text-[#8E8E93]">
              Today 9:41 AM
            </div>
            {messages.slice(0, visibleCount).map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex animate-in flex-col fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "client" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-[20px] px-3.5 py-2.5 text-[15px] leading-[1.32] shadow-[0_1px_0_rgba(0,0,0,0.03)]",
                    message.role === "client"
                      ? "rounded-br-[6px] bg-[#007AFF] text-white"
                      : "rounded-bl-[6px] bg-[#E9E9EB] text-[#111827]",
                  )}
                >
                  {message.text}
                  {message.link ? (
                    <>
                      {" "}
                      <span className={message.role === "client" ? "underline" : "text-[#007AFF] underline"}>
                        {message.link}
                      </span>
                    </>
                  ) : null}
                </div>
                {message.role === "client" ? (
                  <div className="mr-2 mt-1 text-right text-[11px] font-medium text-[#8E8E93]">
                    Delivered
                  </div>
                ) : null}
              </div>
            ))}

            {showTyping ? (
              <div className="animate-in fade-in duration-300">
                <TypingDots />
                <div className="ml-2 mt-1 text-[11px] font-medium text-[#8E8E93]">AI is typing...</div>
              </div>
            ) : null}
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-[#D1D1D6]/80 bg-[#F7F7F8]/95 px-3 pb-4 pt-2 shadow-[0_-1px_0_rgba(255,255,255,0.7)_inset] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93]" aria-label="Add attachment">
                <Plus className="h-5 w-5" />
              </button>
              <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-[#D1D1D6] bg-white px-3">
                <Camera className="h-4 w-4 text-[#8E8E93]" />
                <span className="flex-1 text-[16px] text-[#8E8E93]">{t("phoneInputLabel")}</span>
                <Mic className="h-4 w-4 text-[#8E8E93]" />
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#007AFF] text-white" aria-label="Send message">
                <ArrowUp className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
