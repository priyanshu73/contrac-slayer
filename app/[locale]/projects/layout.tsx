import type { ReactNode } from "react"
import styles from "./mobile-projects.module.css"

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <div className={styles.mobileWorkProjects}>{children}</div>
}
