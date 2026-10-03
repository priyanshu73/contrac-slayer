"use client"
import {isWebsiteV2,type PublicWebsite} from "@/lib/types/website"
import {WebsiteFrame} from "@/components/websites/website-frame"
import {WebsiteEstimateForm} from "./website-estimate-form"
import styles from "@/components/websites/website.module.css"
export function WebsiteEstimatePage({site,preview=false,assetPreviews={}}:{site:PublicWebsite;preview?:boolean;assetPreviews?:Record<string,string>}) {
 const c=site.content;const company=isWebsiteV2(c)?c.identity.company_name:c.company_name
 return <WebsiteFrame site={site} preview={preview} assetPreviews={assetPreviews} childPage><div className={styles.estimateLayout}><div className={styles.estimateIntro}><a href={preview?undefined:`/sites/${encodeURIComponent(site.slug)}`} className={styles.estimateBack}>← Back to website</a><p className={styles.eyebrow}>Let's talk about your project</p><h1>Request an estimate.</h1><p>Share what you have in mind with {company}. Add details, photos or measurements to help us understand the work.</p><p className={styles.estimateNote}>No payment. No appointment booked. Your details go to the contractor for review.</p></div><WebsiteEstimateForm slug={site.slug} company={company} preview={preview} legacyUrl={`/en/quote-request/${encodeURIComponent(site.contractor_uuid)}`} phone={isWebsiteV2(c)?c.public_contact.phone:c.phone} email={isWebsiteV2(c)?c.public_contact.email:c.email}/></div></WebsiteFrame>
}
