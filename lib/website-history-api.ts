import {api} from "./api"
import type {WebsiteContent} from "./types/website"
type RequestTransport={request:<T>(path:string)=>Promise<T>}
export const websiteHistoryApi={
 getWebsiteRevisionPage(before?:number):Promise<{items:Array<{revision:number;schema_version:number;created_at:string;reason:string}>;next_before:number|null}>{
  return (api as unknown as RequestTransport).request(`/website/revisions/page${before!==undefined?`?before=${before}`:""}`)
 },
 getWebsiteRevisionSnapshot(revision:number):Promise<{revision:number;content:WebsiteContent}>{
  return (api as unknown as RequestTransport).request(`/website/revisions/${revision}`)
 }
}
