import Image from "next/image"
import { websitePublicText as t } from "@/lib/website-i18n"
import { ArrowDown, ArrowUpRight, Hammer, Mail, MapPin, Phone } from "lucide-react"
import type { PublicWebsite } from "@/lib/types/website"
import styles from "./website.module.css"

// The same renderer powers the editor preview and the public website.
export function ContractorWebsite({ site, preview = false }: { site: PublicWebsite; preview?: boolean }) {
  const { content } = site
  const quoteUrl = `/en/quote-request/${encodeURIComponent(site.contractor_uuid)}`
  const bookingUrl = site.booking_slug ? `/book/${encodeURIComponent(site.booking_slug)}` : null
  const contactUrl = preview ? undefined : quoteUrl
  const safeImage = (url: string | null) => url && /^https?:\/\//i.test(url) ? url : undefined

  return (
    <div className={`${styles.site} ${styles[content.template]}`}>
      <header className={styles.header}>
        <a className={styles.brand} href={preview ? undefined : "#home"}>
          {safeImage(content.logo_url) ? <Image src={safeImage(content.logo_url)!} alt="" width={38} height={38} unoptimized className={styles.logo} /> : <Hammer size={23} aria-hidden="true" />}
          <span>{content.company_name}</span>
        </a>
        <nav className={styles.nav} aria-label={t("navigation")}>
          {content.services.length > 0 && <a href={preview ? undefined : "#services"}>{t("services")}</a>}
          {content.about && <a href={preview ? undefined : "#about"}>{t("about")}</a>}
          <a href={preview ? undefined : "#contact"}>{t("contact")} <ArrowUpRight size={15} /></a>
        </nav>
      </header>
      <main id="home">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{content.service_area || content.company_name}</p>
            <h1>{content.headline}</h1>
            {content.description && <p className={styles.description}>{content.description}</p>}
            <div className={styles.actions}>
              <a className={styles.primary} href={contactUrl}>{t("estimate")} <ArrowUpRight size={18} /></a>
              {content.phone && <a className={styles.phone} href={preview ? undefined : `tel:${content.phone.replace(/[^+\d]/g, "")}`}><Phone size={16} /> {content.phone}</a>}
            </div>
          </div>
          <div className={styles.heroVisual}>
            {safeImage(content.hero_image_url) ? (
              <Image src={safeImage(content.hero_image_url)!} alt={t("workBy", { company: content.company_name })} width={1000} height={1000} unoptimized className={styles.heroImage} fetchPriority="high" />
            ) : (
              <div className={styles.architecture} aria-hidden="true"><div /><div /><div /><span>{t("builtAroundYou")}</span></div>
            )}
            <a className={styles.visualCaption} href={preview ? undefined : "#contact"}>{t("projectStarts")} <ArrowDown size={17} /></a>
          </div>
        </section>
        {content.services.length > 0 && (
          <section id="services" className={styles.section}>
            <div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("whatWeDo")}</p><h2>{t("servicesHeading")}</h2></div>
            <div className={styles.services}>{content.services.map((service, index) => (
              <div className={styles.service} key={`${service}-${index}`}><span className={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</span><h3>{service}</h3><ArrowUpRight size={20} aria-hidden="true" /></div>
            ))}</div>
          </section>
        )}
        {content.about && (
          <section id="about" className={`${styles.section} ${styles.about}`}>
            <div><p className={styles.eyebrow}>{t("getToKnowUs")}</p><h2>{content.company_name}</h2></div>
            <p>{content.about}</p>
          </section>
        )}
        <section id="contact" className={styles.contact}>
          <div><p className={styles.eyebrow}>{t("getStarted")}</p><h2>{t("contactHeading")}</h2><a className={styles.primary} href={contactUrl}>{t("projectCta")} <ArrowUpRight size={18} /></a></div>
          <div className={styles.contactDetails}>
            {content.phone && <a href={preview ? undefined : `tel:${content.phone.replace(/[^+\d]/g, "")}`}><Phone size={18} /> {content.phone}</a>}
            {content.email && <a href={preview ? undefined : `mailto:${content.email}`}><Mail size={18} /> {content.email}</a>}
            {content.service_area && <p><MapPin size={18} /> {content.service_area}</p>}
            {bookingUrl && <a href={preview ? undefined : bookingUrl}>{t("book")} <ArrowUpRight size={18} /></a>}
          </div>
        </section>
      </main>
      <footer className={styles.footer}><span>© {new Date().getFullYear()} {content.company_name}</span><span>{t("poweredBy")}</span></footer>
    </div>
  )
}
