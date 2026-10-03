"use client"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
export interface InlineTextProps { value: string; label: string; maxLength: number; required?: boolean; multiline?: boolean; onCommit: (text: string) => void }
export function WebsiteInlineText({ value,label,maxLength,required=false,multiline=false,onCommit }: InlineTextProps) {
  const t=useTranslations("website.phase4"); const fieldLabel=t(label); const [editing,setEditing]=useState(false); const [text,setText]=useState(value); const [base,setBase]=useState(value); const ref=useRef<HTMLButtonElement>(null)
  useEffect(()=>{ if(!editing) setText(value) },[value,editing])
  const conflict=editing && value!==base; const invalid=required&&!text.trim()
  function close(){setEditing(false);requestAnimationFrame(()=>ref.current?.focus())}
  function done(){if(conflict||invalid)return;onCommit(text);close()}
  return <span style={{display:"block"}}>{editing?<span data-website-inline-editing className="block space-y-2 rounded border border-emerald-700 bg-white p-3 text-slate-900"><label className="block text-xs">{fieldLabel}<textarea autoFocus maxLength={maxLength} rows={multiline?4:2} value={text} className="mt-2 block w-full rounded border p-2 text-base" onChange={e=>setText(multiline?e.target.value:e.target.value.replace(/[\r\n]/g," "))} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();close()} if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();done()}}}/></label>{conflict&&<span role="alert" className="block text-xs text-red-700">{t("inlineConflict")}</span>}{invalid&&<span role="alert" className="block text-xs text-red-700">{t("required")}</span>}<span className="flex gap-2 text-sm"><button type="button" onClick={close} className="rounded border px-3 py-2">{t("cancel")}</button><button type="button" disabled={conflict||invalid} onClick={done} className="rounded border px-3 py-2">{t("done")}</button></span></span>:<><span style={{whiteSpace:"pre-line"}}>{value}</span><button type="button" ref={ref} aria-label={`${t("edit")} ${fieldLabel}`} onClick={()=>{setBase(value);setText(value);setEditing(true)}} style={{fontSize:12,display:"inline-block",border:"1px solid currentColor",borderRadius:4,padding:"6px 10px",marginTop:6}}>{t("edit")}</button></>}</span>
}
