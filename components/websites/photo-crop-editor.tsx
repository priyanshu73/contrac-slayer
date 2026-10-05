"use client"
import Image from "next/image"
import { useState } from "react"
import { useTranslations } from "next-intl"
import type { WebsitePhotoCrop } from "@/lib/types/website"
import { websitePhotoCropStyle } from "@/lib/website-photo-crop"
import { Button } from "@/components/ui/button"
import styles from "./project-gallery-editor.module.css"

export function PhotoCropEditor({ src, crop, title, onApply, onCancel }: { src: string; crop?: WebsitePhotoCrop | null; title: string; onApply: (crop: WebsitePhotoCrop) => void; onCancel: () => void }) {
  const t = useTranslations("website.gallery")
  const [working, setWorking] = useState<WebsitePhotoCrop>(crop ?? { x: .5, y: .5, zoom: 1 })
  return <div className={styles.cropPanel} role="group" aria-label={`${t("framePhoto")}: ${title}`}>
    <div className={styles.cropViewport}><Image src={src} width={960} height={720} unoptimized alt={title} style={websitePhotoCropStyle(working)} /></div>
    <p className={styles.hint}>{t("frameHint")}</p>
    {(["x", "y", "zoom"] as const).map(axis => <label className={styles.field} key={axis}><span>{t(axis === "x" ? "horizontal" : axis === "y" ? "vertical" : "zoom")}: {axis === "zoom" ? `${working[axis].toFixed(1)}x` : `${Math.round(working[axis] * 100)}%`}</span><input autoFocus={axis === "x"} type="range" min={axis === "zoom" ? 1 : 0} max={axis === "zoom" ? 3 : 1} step={axis === "zoom" ? .1 : .01} value={working[axis]} onChange={event => setWorking(old => ({ ...old, [axis]: Number(event.target.value) }))} /></label>)}
    <div className={styles.actions}><Button type="button" variant="outline" onClick={() => setWorking({ x: .5, y: .5, zoom: 1 })}>{t("resetFrame")}</Button><Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button><Button type="button" onClick={() => onApply(working)}>{t("applyFrame")}</Button></div>
  </div>
}
