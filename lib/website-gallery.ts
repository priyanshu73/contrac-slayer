import type { WebsiteContentV2, WebsiteProject, WebsiteProjectImage } from "./types/website"

export const MAX_WEBSITE_PROJECTS = 50
export const MAX_PROJECT_IMAGES = 20

function ordered<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, order) => ({ ...item, order }))
}
function move<T>(items: T[], id: string, to: number, getId: (item: T) => string): T[] {
  const from = items.findIndex((item) => getId(item) === id)
  if (from < 0 || !Number.isInteger(to) || to < 0 || to >= items.length) throw new Error("Invalid gallery position")
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
function editProject(content: WebsiteContentV2, projectId: string, edit: (project: WebsiteProject) => WebsiteProject): WebsiteContentV2 {
  if (!content.projects.some((project) => project.id === projectId)) throw new Error("Project not found")
  return { ...content, projects: content.projects.map((project) => project.id === projectId ? edit(project) : project) }
}
function requireImage(project: WebsiteProject, imageId: string): WebsiteProjectImage {
  const image = project.images.find((item) => item.id === imageId)
  if (!image) throw new Error("Image not found")
  return image
}
function unpairImages(images: WebsiteProjectImage[], pairIds: Set<string>): WebsiteProjectImage[] {
  return images.map((image) => image.pair_id && pairIds.has(image.pair_id) ? { ...image, pair_id: null, pair_role: null } : image)
}

// IDs come from the caller's UUID generator; never infer approval from adding
// content. These operations touch private draft data only, not assets or APIs.
export function addWebsiteProject(content: WebsiteContentV2, projectId: string, title = ""): WebsiteContentV2 {
  if (!projectId || content.projects.some((project) => project.id === projectId)) throw new Error("Project ID must be unique")
  if (content.projects.length >= MAX_WEBSITE_PROJECTS) throw new Error("Project limit reached")
  const project: WebsiteProject = { id: projectId, order: content.projects.length, title, service_ids: [], description: "", town: null, approximate_date: null, images: [] }
  return { ...content, projects: [...content.projects, project] }
}
export function updateWebsiteProject(content: WebsiteContentV2, projectId: string, changes: Partial<Pick<WebsiteProject, "title" | "description" | "town" | "approximate_date" | "service_ids">>): WebsiteContentV2 {
  return editProject(content, projectId, (project) => ({ ...project, ...changes, ...(changes.service_ids ? { service_ids: [...changes.service_ids] } : {}) }))
}
export function removeWebsiteProject(content: WebsiteContentV2, projectId: string): WebsiteContentV2 {
  if (!content.projects.some((project) => project.id === projectId)) throw new Error("Project not found")
  return { ...content, projects: ordered(content.projects.filter((project) => project.id !== projectId)) }
}
export function moveWebsiteProject(content: WebsiteContentV2, projectId: string, to: number): WebsiteContentV2 {
  return { ...content, projects: ordered(move(content.projects, projectId, to, (project) => project.id)) }
}

export function addWebsiteProjectImage(content: WebsiteContentV2, projectId: string, imageId: string, confirmedAssetId: string): WebsiteContentV2 {
  if (!imageId || !confirmedAssetId) throw new Error("Image and confirmed asset IDs are required")
  if (content.projects.some((project) => project.images.some((image) => image.id === imageId))) throw new Error("Image ID must be unique")
  return editProject(content, projectId, (project) => {
    if (project.images.length >= MAX_PROJECT_IMAGES) throw new Error("Image limit reached")
    const image: WebsiteProjectImage = { id: imageId, order: project.images.length, asset_id: confirmedAssetId, alt: "", caption: "", pair_id: null, pair_role: null }
    return { ...project, images: [...project.images, image] }
  })
}
export function updateWebsiteProjectImage(content: WebsiteContentV2, projectId: string, imageId: string, changes: Partial<Pick<WebsiteProjectImage, "alt" | "caption" | "crop">>): WebsiteContentV2 {
  return editProject(content, projectId, (project) => {
    requireImage(project, imageId)
    return { ...project, images: project.images.map((image) => image.id === imageId ? { ...image, ...changes } : image) }
  })
}
export function removeWebsiteProjectImage(content: WebsiteContentV2, projectId: string, imageId: string): WebsiteContentV2 {
  return editProject(content, projectId, (project) => {
    const image = requireImage(project, imageId)
    const remaining = project.images.filter((item) => item.id !== imageId)
    return { ...project, images: ordered(unpairImages(remaining, new Set(image.pair_id ? [image.pair_id] : []))) }
  })
}
export function moveWebsiteProjectImage(content: WebsiteContentV2, projectId: string, imageId: string, to: number): WebsiteContentV2 {
  return editProject(content, projectId, (project) => ({ ...project, images: ordered(move(project.images, imageId, to, (image) => image.id)) }))
}
export function unpairWebsiteProjectImage(content: WebsiteContentV2, projectId: string, imageId: string): WebsiteContentV2 {
  return editProject(content, projectId, (project) => {
    const image = requireImage(project, imageId)
    return { ...project, images: unpairImages(project.images, new Set(image.pair_id ? [image.pair_id] : [])) }
  })
}
export function pairWebsiteProjectImages(content: WebsiteContentV2, projectId: string, beforeId: string, afterId: string, pairId: string): WebsiteContentV2 {
  if (!pairId || beforeId === afterId) throw new Error("A pair needs two different photos and a pair ID")
  if (content.projects.some((project) => project.images.some((image) => image.pair_id === pairId))) throw new Error("Pair ID must be unique")
  return editProject(content, projectId, (project) => {
    const before = requireImage(project, beforeId)
    const after = requireImage(project, afterId)
    const oldPairs = new Set([before.pair_id, after.pair_id].filter((id): id is string => Boolean(id)))
    const images = unpairImages(project.images, oldPairs).map((image) => image.id === beforeId
      ? { ...image, pair_id: pairId, pair_role: "before" as const }
      : image.id === afterId ? { ...image, pair_id: pairId, pair_role: "after" as const } : image)
    return { ...project, images }
  })
}
