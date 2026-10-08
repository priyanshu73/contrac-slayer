import type { ProjectListItem } from "@/lib/types"

export interface QuoteEstimateContext {
    projectType: string
    projectTitle?: string | null
    serviceDescription: string
    laborRate: number
    laborChargeType: string
    projectBrief?: Record<string, any> | null
    includeProjectBriefInContext?: boolean
    projectId?: number | null
    clientId?: number | null
    clientName?: string | null
    clientEmail?: string | null
    clientPhone?: string | null
}

export interface ProposalContext {
    proposalTitle: string
    projectTitle: string
    description: string
    projectBrief?: Record<string, any> | null
    includeProjectBriefInContext?: boolean
    includeLineItemsInContext?: boolean
    projectId?: number | null
    proposalId?: number | null
    clientId?: number | null
    clientEmail?: string | null
    clientPhone?: string | null
    jobId?: number | null
    lineItems?: Array<{ id: number; title?: string | null; description?: string | null }> | null
}

export interface AIGenerationStatus {
    kind: "estimate" | "proposal"
    phase: "running" | "succeeded" | "failed"
    title: string
    detail?: string
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

// ─── Route → Page Context mapping ──────────────────────────────

export interface PageContext {
    page: string
    entity_id?: string
    job_id?: number
    project_id?: number
    client_id?: number
    lead_id?: number
    proposal_id?: number
    booking_id?: number
    client_email?: string
    client_phone?: string
    locale?: string
    frontend_origin?: string
    customer_quote_url?: string
    route?: string
}

export interface QuotePageContext {
    job_id: number
    project_id?: number
    client_id?: number
    lead_id?: number
    client_email?: string
    quote_public_link?: string
    customer_quote_url?: string
    frontend_origin?: string
}

export interface ContextEnvelope {
    surface: string
    page: {
        page_type: string
        route?: string
        locale?: string
        frontend_origin?: string
    }
    selection?: {
        entity_type?: string
        entity_id?: string | number
    }
    related_refs?: {
        job_id?: number
        project_id?: number
        client_id?: number
        lead_id?: number
        proposal_id?: number
        booking_id?: number
    }
    ui_hints?: {
        client_email?: string
        client_phone?: string
        customer_quote_url?: string
    }
    preloaded_snapshot?: Record<string, unknown>
}

export interface SelectedProjectContext {
    type: "project"
    projectId: number
    projectName: string
    source: "auto" | "manual"
}

export interface PendingProjectContextSwitch {
    projectId: number
    projectName: string
    source: "auto" | "manual"
}

export function preferProjectScope<T extends { project_id?: number | null; client_id?: number | null }>(value: T): T {
    if (value.project_id != null) {
        return {
            ...value,
            client_id: undefined,
        }
    }
    return value
}

export function enrichPageContext(
    base: PageContext,
    locale: string,
    estimateContext: QuoteEstimateContext,
    proposalContext: ProposalContext,
): PageContext {
    const origin =
        typeof window !== "undefined" ? window.location.origin : undefined
    let ctx: PageContext = origin ? { ...base, frontend_origin: origin } : { ...base }

    if (typeof window === "undefined") {
        return { ...ctx, locale }
    }

    const win = window as Window & { quotePageContext?: QuotePageContext }
    if (ctx.page === "quote_detail") {
        const quoteCtx = win.quotePageContext
        if (quoteCtx?.job_id) {
            ctx = {
                ...ctx,
                entity_id: String(quoteCtx.job_id),
                job_id: quoteCtx.job_id,
                project_id: quoteCtx.project_id,
                client_id: quoteCtx.client_id,
                lead_id: quoteCtx.lead_id,
                client_email: quoteCtx.client_email,
                locale,
                frontend_origin: quoteCtx.frontend_origin ?? origin,
                customer_quote_url: quoteCtx.customer_quote_url,
            }
        }
    }

    if (ctx.page === "proposal_builder") {
        const proposalId =
            proposalContext.proposalId != null ? String(proposalContext.proposalId) : ctx.entity_id
        ctx = preferProjectScope({
            ...ctx,
            entity_id: proposalId,
            proposal_id: proposalContext.proposalId ?? ctx.proposal_id,
            project_id: proposalContext.projectId ?? ctx.project_id,
            client_id: proposalContext.clientId ?? ctx.client_id,
            job_id: proposalContext.jobId ?? ctx.job_id,
            client_email: proposalContext.clientEmail ?? ctx.client_email,
            client_phone: proposalContext.clientPhone ?? ctx.client_phone,
        })
    }

    if (ctx.page === "unknown") {
        const hasEstimateContext =
            !!estimateContext.projectId ||
            !!estimateContext.projectType?.trim() ||
            !!estimateContext.serviceDescription?.trim()
        if (hasEstimateContext) {
            ctx = preferProjectScope({
                ...ctx,
                page: "quote_builder",
                project_id: estimateContext.projectId ?? ctx.project_id,
                client_id: estimateContext.clientId ?? ctx.client_id,
                client_email: estimateContext.clientEmail ?? ctx.client_email,
                client_phone: estimateContext.clientPhone ?? ctx.client_phone,
            })
        }
    }

    return {
        ...ctx,
        locale,
        route: ctx.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    }
}

export function pageTypeToEntityType(pageType: string): string | undefined {
    switch (pageType) {
        case "quote_detail":
            return "quote"
        case "project_detail":
            return "project"
        case "client_detail":
            return "client"
        case "lead_detail":
            return "lead"
        case "booking_detail":
            return "booking"
        case "proposal_builder":
            return "proposal"
        case "subcontractor_detail":
            return "subcontractor"
        case "invoice_detail":
            return "invoice"
        default:
            return undefined
    }
}

export function buildPreloadedSnapshot(
    pageContext: PageContext,
    estimateContext: QuoteEstimateContext,
    proposalContext: ProposalContext,
): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {}

    if (pageContext.page === "quote_builder") {
        snapshot.quote_builder = preferProjectScope({
            client_name: estimateContext.clientName ?? null,
            project_title: estimateContext.projectTitle ?? null,
            project_type: estimateContext.projectType,
            service_description: estimateContext.serviceDescription,
            labor_rate: estimateContext.laborRate,
            labor_charge_type: estimateContext.laborChargeType,
            include_project_brief: estimateContext.includeProjectBriefInContext ?? true,
            project_brief: estimateContext.projectBrief ?? null,
            project_id: estimateContext.projectId ?? null,
            client_id: estimateContext.clientId ?? null,
            client_email: estimateContext.clientEmail ?? null,
            client_phone: estimateContext.clientPhone ?? null,
        })
    }

    if (pageContext.page === "proposal_builder") {
        snapshot.proposal_builder = preferProjectScope({
            proposal_title: proposalContext.proposalTitle,
            project_title: proposalContext.projectTitle,
            description: proposalContext.description,
            include_project_brief: proposalContext.includeProjectBriefInContext ?? true,
            project_brief: proposalContext.projectBrief ?? null,
            project_id: proposalContext.projectId ?? null,
            proposal_id: proposalContext.proposalId ?? null,
            client_id: proposalContext.clientId ?? null,
            client_email: proposalContext.clientEmail ?? null,
            client_phone: proposalContext.clientPhone ?? null,
            job_id: proposalContext.jobId ?? null,
        })
    }

    return snapshot
}

export function buildContextEnvelope(
    pageContext: PageContext,
    pathname: string,
    locale: string,
    activeProjectId: number | null,
    estimateContext: QuoteEstimateContext,
    proposalContext: ProposalContext,
): ContextEnvelope {
    const frontendOrigin =
        pageContext.frontend_origin ||
        (typeof window !== "undefined" ? window.location.origin : undefined)
    const entityType = pageTypeToEntityType(pageContext.page)
    const relatedRefs = preferProjectScope<NonNullable<ContextEnvelope["related_refs"]>>({
        job_id: pageContext.job_id,
        project_id: activeProjectId ?? pageContext.project_id ?? undefined,
        client_id: pageContext.client_id,
        lead_id: pageContext.lead_id,
        proposal_id: pageContext.proposal_id,
        booking_id: pageContext.booking_id,
    })

    if (pageContext.page === "project_detail" && pageContext.entity_id && !relatedRefs.project_id) {
        const parsed = Number(pageContext.entity_id)
        if (Number.isFinite(parsed)) relatedRefs.project_id = parsed
    }
    if (pageContext.page === "quote_detail" && pageContext.job_id && !relatedRefs.job_id) {
        relatedRefs.job_id = pageContext.job_id
    }
    if (pageContext.page === "proposal_builder" && pageContext.entity_id && !relatedRefs.proposal_id) {
        const parsed = Number(pageContext.entity_id)
        if (Number.isFinite(parsed)) relatedRefs.proposal_id = parsed
    }
    if (pageContext.page === "booking_detail" && pageContext.entity_id && !relatedRefs.booking_id) {
        const parsed = Number(pageContext.entity_id)
        if (Number.isFinite(parsed)) relatedRefs.booking_id = parsed
    }

    return {
        surface: "chat_panel",
        page: {
            page_type: pageContext.page,
            route: pathname,
            locale,
            frontend_origin: frontendOrigin,
        },
        selection: entityType
            ? {
                  entity_type: entityType,
                  entity_id: pageContext.entity_id,
              }
            : undefined,
        related_refs: relatedRefs,
        ui_hints: {
            client_email: pageContext.client_email,
            client_phone: pageContext.client_phone,
            customer_quote_url: pageContext.customer_quote_url,
        },
        preloaded_snapshot: buildPreloadedSnapshot(pageContext, estimateContext, proposalContext),
    }
}

export const DETAIL_ROUTES: { pattern: RegExp; page: string }[] = [
    { pattern: /\/crew\/([^/]+)/, page: "subcontractor_detail" },
    { pattern: /\/clients\/([^/]+)/, page: "client_detail" },
    { pattern: /\/leads\/([^/]+)/, page: "lead_detail" },
    { pattern: /\/projects\/\d+\/proposals\/([^/]+)/, page: "proposal_builder" },
    { pattern: /\/quotes\/(\d+)\/proposal/, page: "proposal_builder" },
    { pattern: /\/projects\/([^/]+)/, page: "project_detail" },
    { pattern: /\/quotes\/([^/]+)/, page: "quote_detail" },
    { pattern: /\/calendar\/([^/]+)/, page: "booking_detail" },
    { pattern: /\/invoices\/([^/]+)/, page: "invoice_detail" },
]

export const LIST_ROUTES: { pattern: RegExp; page: string }[] = [
    { pattern: /\/dashboard/, page: "dashboard" },
    { pattern: /\/(clients|crew)/, page: "contacts" },
    { pattern: /\/leads/, page: "leads" },
    { pattern: /\/projects/, page: "projects" },
    { pattern: /\/quotes/, page: "quotes" },
    { pattern: /\/calendar/, page: "calendar" },
    { pattern: /\/invoices/, page: "invoices" },
    { pattern: /\/settings/, page: "settings" },
]

export function parsePageContext(pathname: string): PageContext {
    // Strip locale prefix (e.g. /en/contacts/42 → /contacts/42)
    const stripped = pathname.replace(/^\/[a-z]{2}/, "")

    // Check detail routes first (more specific)
    for (const route of DETAIL_ROUTES) {
        const match = stripped.match(route.pattern)
        if (match && match[1] && match[1] !== "new" && match[1] !== "copy") {
            return { page: route.page, entity_id: match[1] }
        }
    }

    // Check list routes
    for (const route of LIST_ROUTES) {
        if (route.pattern.test(stripped)) {
            return { page: route.page }
        }
    }

    return { page: "unknown" }
}

export function parseProjectRouteId(pathname: string): number | null {
    const stripped = pathname.replace(/^\/[a-z]{2}/, "")
    const match = stripped.match(/^\/projects\/(\d+)(?:\/|$)/)
    if (!match) return null
    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
}

export interface ProcessStep {
    id?: string
    step: string
    tool?: string
    toolCallId?: string
    status?: "running" | "completed" | "error"
}

export interface ActionCardOption {
    id: string
    label: string
    prompt: string
    style?: "primary" | "secondary" | "ghost" | string
}

export interface ActionCard {
    action?: string
    title: string
    description?: string
    options: ActionCardOption[]
    entity?: Record<string, unknown>
    interruptId?: string
    commandId?: number | string
    approvalToken?: string
    status?: "pending" | "approved" | "rejected" | "executing" | "completed" | "failed"
    result?: Record<string, unknown>
    editedPayload?: Record<string, unknown>
    replayed?: boolean
}

export interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    processSteps?: ProcessStep[]
    actionCard?: ActionCard
}

export interface Conversation {
    id: number
    title: string
    created_at: string
    updated_at: string
    is_archived: boolean
}

// ─── View type ─────────────────────────────────────────────────
export type PanelView = "chat" | "conversations" | "notifications" | "scope"
export type ChatLaunchMode = "general" | "quote_estimate" | "proposal"
