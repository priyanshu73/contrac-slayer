"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { ENTERPRISE_CONTACT_HREF } from "@/components/enterprise"

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[#eadfd7] bg-[#fdfaf7] px-3.5 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400"
const labelClass = "block text-xs font-black text-slate-700"

export function EnterprisePilotForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", locations: "2-5", focus: "" })

  const update = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const address = ENTERPRISE_CONTACT_HREF.split("?")[0]
    const body = [
      `Name: ${form.name}`,
      `Work email: ${form.email}`,
      `Company: ${form.company}`,
      `Locations: ${form.locations}`,
      `What we'd fix first: ${form.focus}`,
    ].join("\n")
    window.location.href = `${address}?subject=${encodeURIComponent(
      `ContractorOps enterprise pilot - ${form.company || form.name}`,
    )}&body=${encodeURIComponent(body)}`
  }

  return (
    <form
      onSubmit={onSubmit}
      className="h-full rounded-2xl border border-[#eadfd7] bg-white p-6 shadow-[0_18px_60px_rgba(96,75,64,0.08)] sm:p-7"
    >
      <h2 className="text-2xl font-black tracking-tight">Talk to us about a pilot</h2>
      <p className="mt-1.5 text-sm text-slate-500">We&apos;ll map where your leads leak today.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Name
          <input required value={form.name} onChange={update("name")} placeholder="Jane Rivera" className={inputClass} />
        </label>
        <label className={labelClass}>
          Work email
          <input
            required
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="jane@company.com"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Company
          <input value={form.company} onChange={update("company")} placeholder="Company name" className={inputClass} />
        </label>
        <label className={labelClass}>
          Locations
          <select value={form.locations} onChange={update("locations")} className={inputClass}>
            <option>2-5</option>
            <option>6-15</option>
            <option>16-50</option>
            <option>50+</option>
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          What would you fix first?
          <input
            value={form.focus}
            onChange={update("focus")}
            placeholder="Missed calls, booking rate, follow-up..."
            className={inputClass}
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
      >
        Talk to us about a pilot
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  )
}
