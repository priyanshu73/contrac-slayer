import Image from "next/image"
import type { WebsiteProjectImage } from "@/lib/types/website"
import { websitePublicText as t } from "@/lib/website-i18n"
import styles from "./project-photo-gallery.module.css"

export function ProjectPhotoGallery({ images, title, asset }: { images: WebsiteProjectImage[]; title: string; asset: (id: string, width: 480 | 960 | 1600) => string | undefined | null }) {
  const ordered = [...images].sort((a, b) => a.order - b.order)
  const shown = new Set<string>()
  const photo = (image: WebsiteProjectImage) => {
    const src = asset(image.asset_id, 960)
    return src ? <figure key={image.id}><Image src={src} alt={image.alt || title} width={960} height={720} unoptimized />{image.caption && <figcaption>{image.caption}</figcaption>}</figure> : null
  }
  return <div className={styles.photos}>{ordered.map(image => {
    if (shown.has(image.id)) return null
    if (image.pair_id) {
      const pair = ordered.filter(candidate => candidate.pair_id === image.pair_id)
      const before = pair.find(candidate => candidate.pair_role === "before")
      const after = pair.find(candidate => candidate.pair_role === "after")
      if (pair.length === 2 && before && after && before.id !== after.id) {
        shown.add(before.id); shown.add(after.id)
        return <div className={styles.pair} key={image.pair_id}><div><p>{t("before")}</p>{photo(before)}</div><div><p>{t("after")}</p>{photo(after)}</div></div>
      }
    }
    shown.add(image.id)
    return photo(image)
  })}</div>
}
