import type {Metadata,Viewport} from "next"
import {notFound} from "next/navigation"
import {cache} from "react"
import {api} from "@/lib/api"
import {isWebsiteV2} from "@/lib/types/website"
import {WebsiteEstimatePage} from "@/components/estimate/website-estimate-page"
export const dynamic="force-dynamic"
export const viewport:Viewport={width:"device-width",initialScale:1,maximumScale:5,userScalable:true}
const getWebsite=cache((slug:string)=>api.getPublicWebsite(slug))
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const site=await getWebsite((await params).slug);if(!site)return {title:"Website unavailable",robots:{index:false,follow:false}};const company=isWebsiteV2(site.content)?site.content.identity.company_name:site.content.company_name;return {title:`Request an estimate | ${company}`,robots:{index:false,follow:true}}}
export default async function EstimatePage({params}:{params:Promise<{slug:string}>}){const site=await getWebsite((await params).slug);if(!site)notFound();return <WebsiteEstimatePage site={site}/>}
