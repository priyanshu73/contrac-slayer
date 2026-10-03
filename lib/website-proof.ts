import type { WebsiteContentV2, WebsiteTestimonial } from "./types/website"
// Match the complete server-approved item, including order and optional source fields.
export function testimonialFingerprint(item: WebsiteTestimonial): string { return JSON.stringify(Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))) }
export function approvedTestimonialIds(content: WebsiteContentV2, permissions: Record<string, string>): string[] { return content.testimonials.filter(item => permissions[item.id] === testimonialFingerprint(item)).map(item => item.id) }
export function moveProofItem<T extends { id: string; order: number }>(items: T[], id: string, offset: -1 | 1): T[] {
  const ordered = [...items].sort((a,b) => a.order-b.order); const index = ordered.findIndex(item => item.id === id); const destination = index+offset
  if (index < 0 || destination < 0 || destination >= ordered.length) return items
  const [item] = ordered.splice(index,1); ordered.splice(destination,0,item)
  return ordered.map((row,order) => ({...row,order}))
}

export function appendProofItem<T extends {id:string;order:number}>(items:T[],item:T):T[] { return [...[...items].sort((a,b)=>a.order-b.order),item].map((row,order)=>({...row,order})) }
export function removeProofItem<T extends {id:string;order:number}>(items:T[],id:string):T[] { return [...items].sort((a,b)=>a.order-b.order).filter(item=>item.id!==id).map((row,order)=>({...row,order})) }
