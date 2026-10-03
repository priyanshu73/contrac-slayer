"use client"
import type {ReactNode} from "react"
import Image from "next/image"
import {ArrowUpRight,Hammer} from "lucide-react"
import {websitePublicText as t} from "@/lib/website-i18n"
import {isWebsiteV2,type PublicWebsite} from "@/lib/types/website"
import {normalizedSections,websiteAssetUrl} from "@/lib/website-content"
import styles from "./website.module.css"
export function WebsiteFrame({site,children,preview=false,assetPreviews={},childPage=false}:{site:PublicWebsite;children:ReactNode;preview?:boolean;assetPreviews?:Record<string,string>;childPage?:boolean}) {
 const c=site.content;const v2=isWebsiteV2(c);const home=childPage?`/sites/${encodeURIComponent(site.slug)}`:"";const company=v2?c.identity.company_name:c.company_name
 const hasServices=v2?normalizedSections(c.sections).some(s=>s.key==="services"&&s.enabled)&&c.services.length>0:c.services.length>0
 const hasAbout=v2?normalizedSections(c.sections).some(s=>s.key==="about"&&s.enabled)&&Boolean(c.identity.about.trim()):Boolean(c.about.trim())
 const safe=(url:string|null|undefined)=>url&&/^https?:\/\//i.test(url)?url:undefined
 const logo=v2?(c.branding.logo_asset_id?(assetPreviews[c.branding.logo_asset_id]||(preview?undefined:websiteAssetUrl(site.slug,c.branding.logo_asset_id,480))):undefined)||safe(c.branding.legacy_logo_url):safe(c.logo_url)
 const theme=v2?`${styles.v2} ${styles[`layout-${c.branding.template_id}`]||styles.layoutModern} ${styles[`palette-${c.branding.theme.palette}`]||""} ${styles[`font-${c.branding.theme.font_pair_id}`]||""} ${styles[`density-${c.branding.theme.density}`]||""} ${styles[`buttons-${c.branding.theme.button_style}`]||""}`:styles[c.template]
 return <div className={`${styles.site} ${theme}`}><header className={styles.header}><a className={styles.brand} href={preview?undefined:`${home}#home`}>{logo?<Image src={logo} alt={v2?c.branding.logo_alt||"":""} width={64} height={64} unoptimized className={styles.logo}/>:<Hammer size={23} aria-hidden="true"/>}<span>{company}</span></a><nav className={styles.nav} aria-label={t("navigation")}>{hasServices&&<a href={preview?undefined:`${home}#services`}>{t("services")}</a>}{hasAbout&&<a href={preview?undefined:`${home}#about`}>{t("about")}</a>}<a href={preview?undefined:`${home}#contact`}>{t("contact")} <ArrowUpRight size={15}/></a></nav></header><main id="home">{children}</main><footer className={styles.footer}><span>© {new Date().getFullYear()} {company}</span><span>{t("poweredBy")}</span></footer></div>
  }
