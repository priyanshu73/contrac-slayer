import type { ReactNode } from "react"
import styles from "./mobile-frontline.module.css"

export default function FrontlineLayout({ children }: { children: ReactNode }) {
  return <div className={styles.mobileEngageFrontline}>{children}</div>
}
