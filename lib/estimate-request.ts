import { api } from "./api"
import type { Measurements } from "./types"
export const PROJECT_TYPES = ["bathroom_renovation","kitchen_renovation","flooring","painting","roofing","plumbing","electrical","hvac","landscaping","general_construction","other"] as const
export const MAX_ESTIMATE_FILES = 5
export const MAX_ESTIMATE_FILE_BYTES = 10 * 1024 * 1024
export type EstimateFields = { name:string; email:string; phone:string; address:string; project_type:string; description:string }
export function validateEstimate(data:EstimateFields): Partial<Record<keyof EstimateFields,string>> {
 const errors:Partial<Record<keyof EstimateFields,string>> = {}
 if(data.name.trim().length<2||data.name.length>255) errors.name="Enter your full name (2-255 characters)."
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())||data.email.length>255) errors.email="Enter a valid email address."
 if(data.phone.replace(/\D/g,"").length<7||data.phone.length>20) errors.phone="Enter a phone number (7 or more digits)."
 if(!data.address.trim()||data.address.length>500) errors.address="Enter the project address (up to 500 characters)."
 if(!PROJECT_TYPES.includes(data.project_type as typeof PROJECT_TYPES[number])) errors.project_type="Select a project type."
 if(!data.description.trim()||data.description.length>5000) errors.description="Describe your project (up to 5,000 characters)."
 return errors
}
export function validateEstimateFiles(files:File[]):string {
 if(files.length>MAX_ESTIMATE_FILES) return "Choose up to 5 photos."
 if(files.some(f=>f.size>MAX_ESTIMATE_FILE_BYTES||f.size===0)) return "Each photo must be between 1 byte and 10 MB."
 if(files.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type))) return "Use JPEG, PNG or WebP photos."
 return ""
}
const baseURL = () => (api as unknown as {baseURL:string}).baseURL
export class EstimateRequestError extends Error {
 constructor(message:string, public status?:number,public code?:string,public retryAfter?:number) {super(message)}
}
export async function estimateCapabilities(slug:string, signal?:AbortSignal):Promise<{enabled:boolean;site_key?:string}> {
 const response=await fetch(`${baseURL()}/websites/${encodeURIComponent(slug)}/estimate/capabilities`,{credentials:"omit",signal,cache:"no-store"})
 if(!response.ok) return {enabled:false}
 const body=await response.json()
 return {enabled:body.idempotency === "estimate-request-v1" && body.enabled===true,site_key:body.site_key}
}
export async function submitWebsiteEstimate(slug:string, data:EstimateFields & {address_data?:unknown}, files:File[], measurements:Measurements, requestId:string, honeypot:string, challengeToken:string) {
 const form = new FormData()
 for(const [key,value]of Object.entries(data)) if(value!=null) form.append(key,typeof value==="string"?value:JSON.stringify(value))
 form.append("challenge_token",challengeToken);form.append("request_key",requestId);form.append("company_website",honeypot)
 form.append("measurements",JSON.stringify(measurements))
 for(const file of files) form.append("files",file)
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),90000)
 try {
  const response=await fetch(`${baseURL()}/websites/${encodeURIComponent(slug)}/estimate`,{method:"POST",body:form,credentials:"omit",signal:controller.signal})
  const body=await response.json().catch(()=>null)
  if(!response.ok) throw new EstimateRequestError(typeof body?.detail==="string"?body.detail:body?.detail?.message||"Your request could not be confirmed. Keep these details and try again with the same request.",response.status,body?.detail?.code,Number(response.headers.get("Retry-After"))||undefined)
  if(!body||body.accepted!==true) throw new EstimateRequestError("We couldn't confirm delivery. Keep these details and retry the same request.")
  return body
 } catch(error) {
  if(error instanceof EstimateRequestError) throw error
  throw new EstimateRequestError("We couldn't confirm delivery. Your details are still here. Retry sends the same request, not a new one.")
 } finally {clearTimeout(timeout)}
}
