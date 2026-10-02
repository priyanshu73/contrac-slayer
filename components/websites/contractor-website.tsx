import { ProjectPhotoGallery } from "./project-photo-gallery"
import Image from "next/image"
import { websitePublicText as t } from "@/lib/website-i18n"
import { ArrowDown, ArrowUpRight, Clock3, Hammer, Mail, MapPin, Phone } from "lucide-react"
import type { PublicWebsite, WebsiteContentV1, WebsiteContentV2, WebsiteSectionKey } from "@/lib/types/website"
import { isWebsiteV2 } from "@/lib/types/website"
import { normalizedSections, websiteAssetUrl } from "@/lib/website-content"
import styles from "./website.module.css"

interface WebsiteProps { site: PublicWebsite; preview?: boolean; assetPreviews?: Record<string, string> }

export function ContractorWebsite({ site, preview = false, assetPreviews = {} }: WebsiteProps) {
  if (!isWebsiteV2(site.content)) return <LegacyWebsite site={{ ...site, content: site.content }} preview={preview} />
  return <WebsiteV2 site={{ ...site, content: site.content }} preview={preview} assetPreviews={assetPreviews} />
}

function WebsiteV2({ site, preview, assetPreviews }: { site: PublicWebsite & { content: WebsiteContentV2 }; preview: boolean; assetPreviews: Record<string, string> }) {
  const { content } = site
  const template = content.branding.template_id
  const sections = normalizedSections(content.sections).filter((section) => section.enabled)
  const quoteUrl = `/en/quote-request/${encodeURIComponent(site.contractor_uuid)}`
  const bookingUrl = site.booking_slug ? `/book/${encodeURIComponent(site.booking_slug)}` : null
  const contactUrl = preview ? undefined : quoteUrl
  const themeClass = styles[`palette-${content.branding.theme.palette}`] || ""
  const fontClass = styles[`font-${content.branding.theme.font_pair_id}`] || ""
  const densityClass = styles[`density-${content.branding.theme.density}`] || ""
  const buttonClass = styles[`buttons-${content.branding.theme.button_style}`] || ""
  const asset = (id: string | null, width: 480 | 960 | 1600 = 960) => id ? (assetPreviews[id] || websiteAssetUrl(site.slug, id, width)) : undefined
  const logo = asset(content.branding.logo_asset_id, 480) || safeUrl(content.branding.legacy_logo_url)
  const hero = asset(content.branding.hero_asset_id, 1600) || safeUrl(content.branding.legacy_hero_image_url)
  const areas = content.service_areas.map((area) => area.label).join(" · ") || content.legacy_service_area
  const trade = content.identity.custom_trade_label?.trim() || (!["", "unspecified", "other"].includes(content.identity.trade_code) ? content.identity.trade_code.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "")
  const eyebrow = areas.trim() || trade
  const hasServices = sections.some((section) => section.key === "services") && content.services.length > 0
  const hasAbout = sections.some((section) => section.key === "about") && Boolean(content.identity.about.trim())

  const renderSection = (key: WebsiteSectionKey) => {
    switch (key) {
      case "hero": return (
        <section data-section={key} className={styles.hero} key={key}>
          <div className={styles.heroCopy}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1>{content.identity.headline}</h1>
            {content.identity.description && <p className={styles.description}>{content.identity.description}</p>}
            <div className={styles.actions}>
              <a className={styles.primary} href={contactUrl}>{t("estimate")} <ArrowUpRight size={18} /></a>
              {content.public_contact.phone && <a className={styles.phone} href={preview ? undefined : `tel:${content.public_contact.phone.replace(/[^+\d]/g, "")}`}><Phone size={16} /> {content.public_contact.phone}</a>}
            </div>
          </div>
          <div className={styles.heroVisual}>
            {hero ? <Image src={hero} alt={content.branding.hero_alt || t("workBy", { company: content.identity.company_name })} width={1600} height={1000} unoptimized className={styles.heroImage} style={{ objectPosition: `${(content.branding.hero_focal_point?.x ?? .5) * 100}% ${(content.branding.hero_focal_point?.y ?? .5) * 100}%` }} fetchPriority="high" /> : <div className={styles.architecture} aria-hidden="true"><div /><div /><div /><span>{content.identity.company_name}</span></div>}
            <a className={styles.visualCaption} href={preview ? undefined : "#contact"}>{t("projectStarts")} <ArrowDown size={17} /></a>
          </div>
        </section>
      )
      case "services": return content.services.length ? (
        <section data-section={key} id="services" className={styles.section} key={key}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("whatWeDo")}</p><h2>{t("servicesHeading")}</h2></div>
          <div className={styles.services}>{[...content.services].sort((a, b) => a.order - b.order).map((service, index) => <article className={styles.service} key={service.id}><span className={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3>{service.name}</h3>{service.description && <p>{service.description}</p>}{service.price_label && <small>{service.price_label}</small>}</div><ArrowUpRight size={20} aria-hidden="true" /></article>)}</div>
        </section>
      ) : null
      case "projects": return content.projects.length ? (
        <section data-section={key} id="projects" className={`${styles.section} ${styles.projectsSection}`} key={key}><div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("selectedWork")}</p><h2>{t("projectsHeading")}</h2></div><div className={styles.projects}>{[...content.projects].sort((a, b) => a.order - b.order).map((project) => <article className={styles.project} key={project.id}><ProjectPhotoGallery images={project.images} title={project.title} asset={asset} /><div><p className={styles.projectMeta}>{[project.town, project.approximate_date].filter(Boolean).join(" · ")}</p><h3>{project.title}</h3>{project.description && <p>{project.description}</p>}</div></article>)}</div></section>
      ) : null
      case "about": return content.identity.about ? <section data-section={key} id="about" className={`${styles.section} ${styles.about}`} key={key}><div><p className={styles.eyebrow}>{t("getToKnowUs")}</p><h2>{content.identity.company_name}</h2>{content.identity.established_year && <p className={styles.factualLine}>{t("established", { year: content.identity.established_year })}</p>}</div><p>{content.identity.about}</p></section> : null
      case "credentials": return content.credentials.some((item) => item.display_policy !== "hidden") ? <section data-section={key} className={styles.section} key={key}><div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("credentials")}</p><h2>{t("businessDetails")}</h2></div><div className={styles.credentials}>{content.credentials.filter((item) => item.display_policy !== "hidden").map((item) => <div key={item.id}><strong>{item.title}</strong>{item.issuer && <span>{item.issuer}</span>}{item.display_policy === "public_number" && item.public_number && <span>{item.public_number}</span>}</div>)}</div></section> : null
      case "testimonials": return content.testimonials.length ? <section data-section={key} className={`${styles.section} ${styles.testimonials}`} key={key}><div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("customerWords")}</p><h2>{t("sharedWithPermission")}</h2></div>{content.testimonials.map((item) => <blockquote key={item.id}><p>“{item.text}”</p><footer>{item.display_name}{item.rating ? ` · ${t("rating", { rating: item.rating })}` : ""}</footer></blockquote>)}</section> : null
      case "faq": return content.faqs.length ? <section data-section={key} className={`${styles.section} ${styles.faq}`} key={key}><div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("commonQuestions")}</p><h2>{t("answersHeading")}</h2></div><div>{content.faqs.map((item) => <details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section> : null
      case "hours": return content.availability ? <section data-section={key} className={`${styles.section} ${styles.hours}`} key={key}><div><p className={styles.eyebrow}>{t("hours")}</p><h2>{t("availabilityHeading")}</h2><p className={styles.factualLine}>{t("displayHoursDisclaimer")}</p></div><div>{Object.entries(content.availability.weekly).map(([day, value]) => <p key={day}><strong>{day.toUpperCase()}</strong><span>{value.closed ? t("closed") : value.intervals.map((interval) => `${interval.start}–${interval.end}${interval.ends_next_day ? ` ${t("nextDay")}` : ""}`).join(", ")}</span></p>)}</div></section> : null
      case "areas": return areas ? <section data-section={key} className={`${styles.section} ${styles.areas}`} key={key}><MapPin aria-hidden="true" /><div><p className={styles.eyebrow}>{t("serviceArea")}</p><h2>{areas}</h2></div></section> : null
      case "contact": return <section data-section={key} id="contact" className={styles.contact} key={key}><div><p className={styles.eyebrow}>{t("getStarted")}</p><h2>{t("contactHeading")}</h2><a className={styles.primary} href={contactUrl}>{t("projectCta")} <ArrowUpRight size={18} /></a></div><div className={styles.contactDetails}>{content.public_contact.phone && <a href={preview ? undefined : `tel:${content.public_contact.phone.replace(/[^+\d]/g, "")}`}><Phone size={18} /> {content.public_contact.phone}</a>}{content.public_contact.email && <a href={preview ? undefined : `mailto:${content.public_contact.email}`}><Mail size={18} /> {content.public_contact.email}</a>}{areas && <p><MapPin size={18} /> {areas}</p>}{content.availability && <p><Clock3 size={18} /> {content.availability.timezone.replaceAll("_", " ")}</p>}{bookingUrl && <a href={preview ? undefined : bookingUrl}>{t("book")} <ArrowUpRight size={18} /></a>}</div></section>
    }
  }

  const rendered = Object.fromEntries(sections.map((section) => [section.key, renderSection(section.key)]))
  const section = (key: WebsiteSectionKey) => rendered[key]
  const layout = <>{sections.map((s) => renderSection(s.key))}</>

  return (
    <div className={`${styles.site} ${styles.v2} ${styles[`layout-${template}`] || styles.layoutModern} ${themeClass} ${fontClass} ${densityClass} ${buttonClass}`}>
      <header className={styles.header}>
        <a className={styles.brand} href={preview ? undefined : "#home"}>{logo ? <Image src={logo} alt={content.branding.logo_alt || ""} width={64} height={64} unoptimized className={styles.logo} /> : <Hammer size={23} aria-hidden="true" />}<span>{content.identity.company_name}</span></a>
        <nav className={styles.nav} aria-label={t("navigation")}>{hasServices && <a href={preview ? undefined : "#services"}>{t("services")}</a>}{hasAbout && <a href={preview ? undefined : "#about"}>{t("about")}</a>}<a href={preview ? undefined : "#contact"}>{t("contact")} <ArrowUpRight size={15} /></a></nav>
      </header>
      <main id="home">{layout}</main>
      <footer className={styles.footer}><span>© {new Date().getFullYear()} {content.identity.company_name}</span><span>{t("poweredBy")}</span></footer>
    </div>
  )
}

function LegacyWebsite({ site, preview }: { site: PublicWebsite & { content: WebsiteContentV1 }; preview: boolean }) {
  const { content } = site
  const quoteUrl = `/en/quote-request/${encodeURIComponent(site.contractor_uuid)}`
  const bookingUrl = site.booking_slug ? `/book/${encodeURIComponent(site.booking_slug)}` : null
  const contactUrl = preview ? undefined : quoteUrl
  return <div className={`${styles.site} ${styles[content.template]}`}><header className={styles.header}><a className={styles.brand} href={preview ? undefined : "#home"}>{safeUrl(content.logo_url) ? <Image src={safeUrl(content.logo_url)!} alt="" width={38} height={38} unoptimized className={styles.logo} /> : <Hammer size={23} aria-hidden="true" />}<span>{content.company_name}</span></a><nav className={styles.nav} aria-label={t("navigation")}>{content.services.length > 0 && <a href={preview ? undefined : "#services"}>{t("services")}</a>}{content.about.trim() && <a href={preview ? undefined : "#about"}>{t("about")}</a>}<a href={preview ? undefined : "#contact"}>{t("contact")} <ArrowUpRight size={15} /></a></nav></header><main id="home"><section className={styles.hero}><div className={styles.heroCopy}>{content.service_area.trim() && <p className={styles.eyebrow}>{content.service_area}</p>}<h1>{content.headline}</h1>{content.description && <p className={styles.description}>{content.description}</p>}<div className={styles.actions}><a className={styles.primary} href={contactUrl}>{t("estimate")} <ArrowUpRight size={18} /></a>{content.phone && <a className={styles.phone} href={preview ? undefined : `tel:${content.phone.replace(/[^+\d]/g, "")}`}><Phone size={16} /> {content.phone}</a>}</div></div><div className={styles.heroVisual}>{safeUrl(content.hero_image_url) ? <Image src={safeUrl(content.hero_image_url)!} alt={t("workBy", { company: content.company_name })} width={1000} height={1000} unoptimized className={styles.heroImage} fetchPriority="high" /> : <div className={styles.architecture} aria-hidden="true"><div /><div /><div /><span>{t("builtAroundYou")}</span></div>}</div></section>{content.services.length > 0 && <section id="services" className={styles.section}><div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("whatWeDo")}</p><h2>{t("servicesHeading")}</h2></div><div className={styles.services}>{content.services.map((service, index) => <div className={styles.service} key={`${service}-${index}`}><span className={styles.serviceNumber}>{String(index + 1).padStart(2, "0")}</span><h3>{service}</h3></div>)}</div></section>}{content.about && <section id="about" className={`${styles.section} ${styles.about}`}><div><p className={styles.eyebrow}>{t("getToKnowUs")}</p><h2>{content.company_name}</h2></div><p>{content.about}</p></section>}<section id="contact" className={styles.contact}><div><p className={styles.eyebrow}>{t("getStarted")}</p><h2>{t("contactHeading")}</h2><a className={styles.primary} href={contactUrl}>{t("projectCta")}</a></div><div className={styles.contactDetails}>{content.phone && <a href={preview ? undefined : `tel:${content.phone.replace(/[^+\d]/g, "")}`}><Phone size={18} /> {content.phone}</a>}{content.email && <a href={preview ? undefined : `mailto:${content.email}`}><Mail size={18} /> {content.email}</a>}{content.service_area && <p><MapPin size={18} /> {content.service_area}</p>}{bookingUrl && <a href={preview ? undefined : bookingUrl}>{t("book")}</a>}</div></section></main><footer className={styles.footer}><span>© {new Date().getFullYear()} {content.company_name}</span><span>{t("poweredBy")}</span></footer></div>
}

function safeUrl(url: string | null | undefined): string | undefined { return url && /^https?:\/\//i.test(url) ? url : undefined }
