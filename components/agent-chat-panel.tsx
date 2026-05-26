"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import {
    Bot, X, Send, Loader2, Sparkles, Plus,
    MessageSquare, ChevronLeft, Trash2, Clock,
    Sun, BellRing, Maximize2, Minimize2,
    ChevronDown, ChevronUp, Zap, CheckCircle2, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import type { ScopeClarifiedScope, ScopeQuestion, ScopeQuestionAnswer } from "@/lib/api"

interface QuoteEstimateContext {
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

interface ProposalContext {
    proposalTitle: string
    projectTitle: string
    description: string
    projectBrief?: Record<string, any> | null
    includeProjectBriefInContext?: boolean
    projectId?: number | null
    proposalId?: number | null
    clientId?: number | null
    clientEmail?: string | null
    clientPhone?: string | null
    jobId?: number | null
}

interface AIGenerationStatus {
    kind: "estimate" | "proposal"
    phase: "running" | "succeeded" | "failed"
    title: string
    detail?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

// ─── Route → Page Context mapping ──────────────────────────────

interface PageContext {
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

interface QuotePageContext {
    job_id: number
    project_id?: number
    client_id?: number
    lead_id?: number
    client_email?: string
    quote_public_link?: string
    customer_quote_url?: string
    frontend_origin?: string
}

interface ContextEnvelope {
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

function preferProjectScope<T extends { project_id?: number | null; client_id?: number | null }>(value: T): T {
    if (value.project_id != null) {
        return {
            ...value,
            client_id: undefined,
        }
    }
    return value
}

function enrichPageContext(
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

function pageTypeToEntityType(pageType: string): string | undefined {
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

function buildPreloadedSnapshot(
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

function buildContextEnvelope(
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
        project_id: pageContext.project_id ?? activeProjectId ?? undefined,
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

const DETAIL_ROUTES: { pattern: RegExp; page: string }[] = [
    { pattern: /\/crew\/([^/]+)/, page: "subcontractor_detail" },
    { pattern: /\/clients\/([^/]+)/, page: "client_detail" },
    { pattern: /\/leads\/([^/]+)/, page: "lead_detail" },
    { pattern: /\/projects\/\d+\/proposals\/([^/]+)/, page: "proposal_builder" },
    { pattern: /\/projects\/([^/]+)/, page: "project_detail" },
    { pattern: /\/quotes\/([^/]+)/, page: "quote_detail" },
    { pattern: /\/calendar\/([^/]+)/, page: "booking_detail" },
    { pattern: /\/invoices\/([^/]+)/, page: "invoice_detail" },
]

const LIST_ROUTES: { pattern: RegExp; page: string }[] = [
    { pattern: /\/dashboard/, page: "dashboard" },
    { pattern: /\/(clients|crew)/, page: "contacts" },
    { pattern: /\/leads/, page: "leads" },
    { pattern: /\/projects/, page: "projects" },
    { pattern: /\/quotes/, page: "quotes" },
    { pattern: /\/calendar/, page: "calendar" },
    { pattern: /\/invoices/, page: "invoices" },
    { pattern: /\/settings/, page: "settings" },
]

function parsePageContext(pathname: string): PageContext {
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

// ─── Contextual suggestions per page type ──────────────────────

const SUGGESTIONS: Record<string, string[]> = {
    client_detail: [
        "Tell me about this client",
        "Show their quotes",
        "Any upcoming bookings?",
        "Create a quote for them",
    ],
    lead_detail: [
        "Tell me about this lead",
        "What's the status?",
        "Convert to client",
        "Schedule a follow-up",
    ],
    project_detail: [
        "Summarize this project",
        "Show project tasks",
        "What's the status?",
        "Any blockers?",
    ],
    proposal_builder: [
        "Summarize this proposal",
        "What sections are in this proposal?",
        "Help me write the scope summary",
        "What's the project overview?",
    ],
    quote_detail: [
        "Summarize this quote",
        "What's the total?",
        "Add a line item",
        "Send to customer",
    ],
    subcontractor_detail: [
        "Tell me about this crew member",
        "What trades do they handle?",
        "Show their projects",
    ],
    contacts: [
        "List all my clients",
        "Any inactive clients?",
        "Add a new client",
        "Dashboard summary",
    ],
    leads: [
        "How many new leads?",
        "Show unconverted leads",
        "Lead status breakdown",
        "Dashboard summary",
    ],
    projects: [
        "Show active projects",
        "Any blocked tasks?",
        "Project status overview",
        "Dashboard summary",
    ],
    quotes: [
        "Show draft quotes",
        "Any pending quotes?",
        "Create a new quote",
        "Dashboard summary",
    ],
    calendar: [
        "What's my public booking link?",
        "What's on my calendar this week?",
        "Show upcoming appointments",
        "Dashboard summary",
    ],
    default: [
        "What's my booking link?",
        "How many leads do I have?",
        "Show my active projects",
        "What's on my calendar?",
        "Dashboard summary",
    ],
}

// ─── Types ─────────────────────────────────────────────────────

interface ProcessStep {
    step: string
    tool?: string
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    processSteps?: ProcessStep[]
}

interface Conversation {
    id: number
    title: string
    created_at: string
    updated_at: string
    is_archived: boolean
}

// ─── View type ─────────────────────────────────────────────────
type PanelView = "chat" | "conversations" | "scope"
type ChatLaunchMode = "general" | "quote_estimate"

// ─── Status color map (value → color class) ─────────────────────
const STATUS_COLORS: Record<string, string> = {
    "in progress": "text-amber-500 font-medium",
    "not started": "text-slate-400 font-medium",
    "completed": "text-emerald-500 font-medium",
    "blocked": "text-red-500 font-medium",
    "on hold": "text-orange-500 font-medium",
    "done": "text-emerald-500 font-medium",
    "pending": "text-amber-400 font-medium",
    "active": "text-emerald-500 font-medium",
    "inactive": "text-slate-400 font-medium",
    "draft": "text-sky-500 font-medium",
    "sent": "text-violet-500 font-medium",
    "viewed": "text-blue-500 font-medium",
    "accepted": "text-emerald-500 font-medium",
    "declined": "text-red-500 font-medium",
    "new": "text-sky-500 font-medium",
    "converted": "text-emerald-500 font-medium",
    "lost": "text-red-500 font-medium",
    "contacted": "text-violet-400 font-medium",
    "planning": "text-sky-400 font-medium",
    "overdue": "text-red-500 font-medium",
    "cancelled": "text-slate-400 font-medium",
}

// Colorize known status values that appear as text fragments (e.g. ": In Progress")
function colorizeStatusText(text: string): React.ReactNode {
    // Trim and check if the text is (or ends with) a known status value
    // Handles patterns like ": In Progress" or "In Progress" standalone
    const trimmed = text.trim()
    
    // Check exact match or match after a colon
    const colonMatch = text.match(/^(\s*:\s*)(.+)$/)
    if (colonMatch) {
        const prefix = colonMatch[1]
        const value = colonMatch[2].trim()
        const colorClass = STATUS_COLORS[value.toLowerCase()]
        if (colorClass) {
            return <><span className="text-muted-foreground">{prefix}</span><span className={colorClass}>{value}</span></>
        }
    }
    
    // Full-string status match
    const colorClass = STATUS_COLORS[trimmed.toLowerCase()]
    if (colorClass) {
        return <span className={colorClass}>{text}</span>
    }
    
    return text
}

export function AgentChatPanel() {
    const router = useRouter()
    const locale = useLocale()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Multi-chat state
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
    const [panelView, setPanelView] = useState<PanelView>("chat")
    const [isLoadingConversations, setIsLoadingConversations] = useState(false)

    // Quote estimate context (populated when on quote pages)
    const [estimateContext, setEstimateContext] = useState<QuoteEstimateContext>({
        projectType: "",
        projectTitle: "",
        serviceDescription: "",
        laborRate: 75,
        laborChargeType: "HOURLY",
        includeProjectBriefInContext: true,
        clientName: "",
    })
    const [contextExpanded, setContextExpanded] = useState(false)
    const [estimateLoading, setEstimateLoading] = useState(false)
    const [chatLaunchMode, setChatLaunchMode] = useState<ChatLaunchMode>("general")

    // Proposal context (populated when on proposal builder pages)
    const [proposalContext, setProposalContext] = useState<ProposalContext>({
        proposalTitle: "",
        projectTitle: "",
        description: "",
        includeProjectBriefInContext: true,
    })
    const [proposalContextExpanded, setProposalContextExpanded] = useState(false)
    const [proposalLoading, setProposalLoading] = useState(false)
    const [generationStatus, setGenerationStatus] = useState<AIGenerationStatus | null>(null)

    // Scope clarification inline view
    const [scopeQuestions, setScopeQuestions] = useState<ScopeQuestion[]>([])
    const [scopeAnswers, setScopeAnswers] = useState<Record<string, ScopeQuestionAnswer>>({})
    const [scopeLoading, setScopeLoading] = useState(false)
    const [scopeSubmitting, setScopeSubmitting] = useState(false)
    const [scopeTrigger, setScopeTrigger] = useState<"estimate" | "proposal">("estimate")
    const [scopeStep, setScopeStep] = useState(0)

    const [quotePageCtxTick, setQuotePageCtxTick] = useState(0)
    useEffect(() => {
        const onUpdate = () => setQuotePageCtxTick((t) => t + 1)
        window.addEventListener("quote-page-context-updated", onUpdate)
        return () => window.removeEventListener("quote-page-context-updated", onUpdate)
    }, [])

    // Parse page context from current route; quote detail enriches from loaded job on the page
    const pageContext = useMemo(
        () => enrichPageContext(parsePageContext(pathname ?? ""), locale, estimateContext, proposalContext),
        [pathname, locale, quotePageCtxTick, estimateContext, proposalContext]
    )
    const activeProjectId = useMemo(() => {
        if (proposalContext.projectId) return proposalContext.projectId
        if (estimateContext.projectId) return estimateContext.projectId
        if (pageContext.page === "project_detail" && pageContext.entity_id) {
            const parsed = Number(pageContext.entity_id)
            return Number.isFinite(parsed) ? parsed : null
        }
        return null
    }, [estimateContext.projectId, pageContext, proposalContext.projectId])
    const contextEnvelope = useMemo(
        () => buildContextEnvelope(
            pageContext,
            pathname ?? "",
            locale,
            activeProjectId,
            estimateContext,
            proposalContext,
        ),
        [activeProjectId, estimateContext, locale, pageContext, pathname, proposalContext]
    )
    const suggestions = SUGGESTIONS[pageContext.page] || SUGGESTIONS.default

    // Detect if we're on a quote create/edit page
    const isOnQuotePage = useMemo(() => {
        const stripped = (pathname ?? "").replace(/^\/[a-z]{2}/, "")
        return stripped === "/quotes/new" || /^\/quotes\/\d+\/edit$/.test(stripped)
    }, [pathname])

    // Detect if we're on a proposal builder page
    const isOnProposalPage = useMemo(() => {
        const stripped = (pathname ?? "").replace(/^\/[a-z]{2}/, "")
        return /^\/projects\/\d+\/proposals\/\d+$/.test(stripped)
    }, [pathname])

    // Entity color mapping
    const getEntityColorClass = useCallback((toolNameOrPath: string): string => {
        if (!toolNameOrPath) return ""
        const lowered = toolNameOrPath.toLowerCase()
        if (lowered.includes("subcontractor") || lowered.includes("/sub/")) return "text-orange-500"
        if (lowered.includes("client") || lowered.includes("/clients/")) return "text-violet-500"
        if (lowered.includes("project")) return "text-emerald-500"
        if (lowered.includes("lead")) return "text-rose-500 dark:text-rose-400"
        if (lowered.includes("quote") || lowered.includes("job")) return "text-amber-500"
        if (lowered.includes("booking") || lowered.includes("calendar")) return "text-cyan-500"
        return ""
    }, [])

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    useEffect(() => {
        if (isOpen && inputRef.current && panelView === "chat") {
            inputRef.current.focus()
        }
    }, [isOpen, panelView])

    const estimateContextSummary = useMemo(() => {
        const client = estimateContext.clientName?.trim()
        const project = estimateContext.projectTitle?.trim()
        const projectType = estimateContext.projectType?.trim()

        if (client && project) return `${client} • ${project}`
        if (client && projectType) return `${client} • ${projectType}`
        if (project) return project
        if (projectType) return projectType
        if (client) return client
        return ""
    }, [
        estimateContext.clientName,
        estimateContext.projectTitle,
        estimateContext.projectType,
    ])

    const estimateActionSentence = useMemo(() => {
        const client = estimateContext.clientName?.trim()
        const project = estimateContext.projectTitle?.trim()
        const projectType = estimateContext.projectType?.trim()

        if (client && project) return `Create an estimate for ${client} for ${project}.`
        if (client && projectType) return `Create an estimate for ${client} for ${projectType}.`
        if (project) return `Create an estimate for ${project}.`
        if (projectType) return `Create an estimate for ${projectType}.`
        if (client) return `Create an estimate for ${client}.`
        return "Create an estimate for this quote."
    }, [
        estimateContext.clientName,
        estimateContext.projectTitle,
        estimateContext.projectType,
    ])

    const estimateContextNeedsDetail = useMemo(() => {
        const hasDescription = !!estimateContext.serviceDescription?.trim()
        const hasProjectSignal = !!(
            estimateContext.projectTitle?.trim() ||
            estimateContext.projectType?.trim()
        )

        if (!hasDescription) return "Add a project description for better results."
        if (!hasProjectSignal) return "Add a project name or type so the estimate is more specific."
        return "We will use the quote context already loaded on this page."
    }, [
        estimateContext.projectTitle,
        estimateContext.projectType,
        estimateContext.serviceDescription,
    ])

    const quoteEstimateReady = useMemo(() => {
        const desc = estimateContext.serviceDescription?.trim() ?? ""
        const wordCount = desc ? desc.split(/\s+/).length : 0
        return desc.length >= 30 && wordCount >= 6
    }, [estimateContext.serviceDescription])

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<AIGenerationStatus>).detail
            if (!detail) return
            setGenerationStatus(detail)
            setPanelView("chat")
            setIsOpen(true)
            if (detail.kind === "estimate") {
                setEstimateLoading(detail.phase === "running")
            }
            if (detail.kind === "proposal") {
                setProposalLoading(detail.phase === "running")
            }
        }

        window.addEventListener("ai-generation-status", handler)
        return () => window.removeEventListener("ai-generation-status", handler)
    }, [])

    // ─── Conversation API helpers ───────────────────────────────

    const fetchConversations = useCallback(async () => {
        setIsLoadingConversations(true)
        try {
            const res = await fetch(`${API_URL}/agent/conversations`, {
                credentials: "include",
            })
            if (res.ok) {
                const data = await res.json()
                setConversations(data.conversations || [])
            }
        } catch (err) {
            console.error("Failed to fetch conversations:", err)
        } finally {
            setIsLoadingConversations(false)
        }
    }, [])

    const loadConversation = useCallback(async (conversationId: number) => {
        try {
            const res = await fetch(`${API_URL}/agent/conversations/${conversationId}`, {
                credentials: "include",
            })
            if (res.ok) {
                const data = await res.json()
                const loadedMessages: Message[] = (data.messages || []).map((m: any) => ({
                    id: m.id.toString(),
                    role: m.role,
                    content: m.content,
                }))
                setMessages(loadedMessages)
                setActiveConversationId(conversationId)
                setPanelView("chat")
                setChatLaunchMode("general")
            }
        } catch (err) {
            console.error("Failed to load conversation:", err)
        }
    }, [])

    const archiveConversation = useCallback(async (conversationId: number) => {
        try {
            await fetch(`${API_URL}/agent/conversations/${conversationId}`, {
                method: "DELETE",
                credentials: "include",
            })
            setConversations((prev) => prev.filter((c) => c.id !== conversationId))
            if (activeConversationId === conversationId) {
                setActiveConversationId(null)
                setMessages([])
            }
        } catch (err) {
            console.error("Failed to archive conversation:", err)
        }
    }, [activeConversationId])

    // Load conversations when panel opens
    useEffect(() => {
        if (isOpen) {
            fetchConversations()
        }
    }, [isOpen, fetchConversations])

    // Sync estimate context from Quote-creator via window events
    useEffect(() => {
        const syncFromWindow = () => {
            const ctx = (window as any).quoteEstimateContext as QuoteEstimateContext | undefined
            if (ctx) setEstimateContext({ ...ctx, includeProjectBriefInContext: ctx.includeProjectBriefInContext ?? true })
        }
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as QuoteEstimateContext
            setEstimateContext({ ...detail, includeProjectBriefInContext: detail.includeProjectBriefInContext ?? true })
        }
        syncFromWindow()
        window.addEventListener("quote-context-updated", handler)
        return () => window.removeEventListener("quote-context-updated", handler)
    }, [])

    // Listen for header button → open panel in estimate mode
    useEffect(() => {
        const handler = () => {
            // Read latest context from window
            const ctx = (window as any).quoteEstimateContext as QuoteEstimateContext | undefined
            if (ctx) setEstimateContext(ctx)
            // Auto-expand context if both fields are empty
            const isEmpty = !ctx?.projectType?.trim() && !ctx?.serviceDescription?.trim()
            setContextExpanded(isEmpty)
            setIsOpen(true)
            setPanelView("chat")
            setChatLaunchMode("quote_estimate")
        }
        window.addEventListener("open-ai-panel-for-estimate", handler)
        return () => window.removeEventListener("open-ai-panel-for-estimate", handler)
    }, [])

    // Sync proposal context from ProposalBuilder via window events
    useEffect(() => {
        const syncFromWindow = () => {
            const ctx = (window as any).proposalBuilderContext as ProposalContext | undefined
            if (ctx) setProposalContext({ ...ctx, includeProjectBriefInContext: ctx.includeProjectBriefInContext ?? true })
        }
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as ProposalContext
            setProposalContext({ ...detail, includeProjectBriefInContext: detail.includeProjectBriefInContext ?? true })
        }
        syncFromWindow()
        window.addEventListener("proposal-context-updated", handler)
        return () => window.removeEventListener("proposal-context-updated", handler)
    }, [])

    // Listen for header button → open panel in proposal mode
    useEffect(() => {
        const handler = () => {
            const ctx = (window as any).proposalBuilderContext as ProposalContext | undefined
            if (ctx) setProposalContext(ctx)
            const isEmpty = !ctx?.proposalTitle?.trim() && !ctx?.description?.trim()
            setProposalContextExpanded(isEmpty)
            setIsOpen(true)
            setPanelView("chat")
            setChatLaunchMode("general")
        }
        window.addEventListener("open-ai-panel-for-proposal", handler)
        return () => window.removeEventListener("open-ai-panel-for-proposal", handler)
    }, [])

    // ─── Chat handlers ──────────────────────────────────────────

    const handleNewChat = useCallback(() => {
        setActiveConversationId(null)
        setMessages([])
        setPanelView("chat")
        setChatLaunchMode("general")
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

    const _fireEstimate = useCallback((scope: ScopeClarifiedScope | null) => {
        setEstimateLoading(true)
        setChatLaunchMode("quote_estimate")
        setGenerationStatus({
            kind: "estimate",
            phase: "running",
            title: "Generating AI estimate",
            detail: "Handing the scope to the quote builder now.",
        })
        setPanelView("chat")
        setIsOpen(true)
        window.dispatchEvent(new CustomEvent("trigger-ai-estimate", {
            detail: {
                projectType: estimateContext.projectType,
                serviceDescription: estimateContext.serviceDescription,
                laborRate: estimateContext.laborRate,
                laborChargeType: estimateContext.laborChargeType,
                projectBrief: estimateContext.projectBrief,
                includeProjectBriefInContext: estimateContext.includeProjectBriefInContext ?? true,
                clarifiedScope: scope,
            },
        }))
    }, [estimateContext])

    const _fireProposal = useCallback((scope: ScopeClarifiedScope | null) => {
        setProposalLoading(true)
        setGenerationStatus({
            kind: "proposal",
            phase: "running",
            title: "Generating AI proposal",
            detail: "Handing the scope to the proposal builder now.",
        })
        setPanelView("chat")
        setIsOpen(true)
        window.dispatchEvent(new CustomEvent("trigger-ai-proposal", { detail: { clarifiedScope: scope } }))
    }, [])

    const handleGenerateEstimate = useCallback(() => {
        const pid = estimateContext.projectId
        if (pid) {
            setScopeTrigger("estimate")
            setScopeLoading(true)
            setScopeQuestions([])
            setScopeAnswers({})
            setScopeStep(0)
            setPanelView("scope")
            api.getScopeQuestions(pid).then((res) => {
                if (res.existing_scope && !res.is_stale) {
                    setPanelView("chat")
                    _fireEstimate(res.existing_scope)
                } else {
                    setScopeQuestions(res.questions ?? [])
                    setScopeAnswers({})
                    setScopeStep(0)
                }
            }).catch(() => {
                setPanelView("chat")
                _fireEstimate(null)
            }).finally(() => setScopeLoading(false))
        } else {
            _fireEstimate(null)
        }
    }, [estimateContext.projectId, _fireEstimate])

    const handleGenerateProposal = useCallback(() => {
        const pid = proposalContext.projectId
        if (pid) {
            setScopeTrigger("proposal")
            setScopeLoading(true)
            setScopeQuestions([])
            setScopeAnswers({})
            setScopeStep(0)
            setPanelView("scope")
            api.getScopeQuestions(pid).then((res) => {
                if (res.existing_scope && !res.is_stale) {
                    setPanelView("chat")
                    _fireProposal(res.existing_scope)
                } else {
                    setScopeQuestions(res.questions ?? [])
                    setScopeAnswers({})
                    setScopeStep(0)
                }
            }).catch(() => {
                setPanelView("chat")
                _fireProposal(null)
            }).finally(() => setScopeLoading(false))
        } else {
            _fireProposal(null)
        }
    }, [proposalContext.projectId, _fireProposal])

    const handleQuickAction = useCallback((message: string) => {
        setInput(message)
        // Use a micro-delay so setInput triggers the state update, then send
        setTimeout(() => {
            // Directly invoke send logic
            const userMessage: Message = {
                id: Date.now().toString(),
                role: "user",
                content: message,
            }
            setMessages((prev) => [...prev, userMessage])
            setInput("")
            setIsLoading(true)

            const history = [userMessage].map((m) => ({ role: m.role, content: m.content }))
            const assistantId = (Date.now() + 1).toString()
            setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

            fetch(`${API_URL}/agent/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    messages: history,
                    page_context: pageContext,
                    context_envelope: contextEnvelope,
                    conversation_id: activeConversationId || undefined,
                    project_id: activeProjectId || undefined,
                }),
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const reader = res.body?.getReader()
                    const decoder = new TextDecoder()
                    if (!reader) throw new Error("No response body")

                    let buffer = ""
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split("\n")
                        buffer = lines.pop() || ""
                        for (const line of lines) {
                            const trimmed = line.trim()
                            if (!trimmed.startsWith("data: ")) continue
                            const data = trimmed.slice(6)
                            if (data === "[DONE]") break
                            try {
                                const parsed = JSON.parse(data)
                                if (parsed.conversation_id && !activeConversationId) {
                                    setActiveConversationId(parsed.conversation_id)
                                }
                                if (parsed.process_step) {
                                    setMessages((prev) =>
                                        prev.map((m) => {
                                            if (m.id === assistantId) {
                                                const currentSteps = m.processSteps || []
                                                return {
                                                    ...m,
                                                    processSteps: [...currentSteps, { step: parsed.process_step, tool: parsed.tool }]
                                                }
                                            }
                                            return m
                                        })
                                    )
                                }
                                if (parsed.content) {
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === assistantId
                                                ? { ...m, content: m.content + parsed.content }
                                                : m
                                        )
                                    )
                                }
                            } catch {}
                        }
                    }
                    fetchConversations()
                })
                .catch((err) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, content: "Sorry, I encountered an error. Please try again." }
                                : m
                        )
                    )
                    console.error("Quick action error:", err)
                })
                .finally(() => setIsLoading(false))
        }, 0)
    }, [pageContext, contextEnvelope, activeConversationId, fetchConversations, activeProjectId])

    const handleSend = async () => {
        const text = input.trim()
        if (!text || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        // Build message history for the API
        const history = [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
        }))

        const assistantId = (Date.now() + 1).toString()
        setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "" },
        ])

        try {
            const res = await fetch(`${API_URL}/agent/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    messages: history,
                    page_context: pageContext,
                    context_envelope: contextEnvelope,
                    conversation_id: activeConversationId || undefined,
                    project_id: activeProjectId || undefined,
                }),
            })

            if (!res.ok) {
                const errText = await res.text()
                throw new Error(errText || `HTTP ${res.status}`)
            }

            const reader = res.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error("No response body")

            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed.startsWith("data: ")) continue

                    const data = trimmed.slice(6)
                    if (data === "[DONE]") break

                    try {
                        const parsed = JSON.parse(data)

                        // Handle conversation_id metadata event
                        if (parsed.conversation_id && !activeConversationId) {
                            setActiveConversationId(parsed.conversation_id)
                        }

                        // Handle process_step event
                        if (parsed.process_step) {
                            setMessages((prev) =>
                                prev.map((m) => {
                                    if (m.id === assistantId) {
                                        const currentSteps = m.processSteps || []
                                        return {
                                            ...m,
                                            processSteps: [...currentSteps, { step: parsed.process_step, tool: parsed.tool }]
                                        }
                                    }
                                    return m
                                })
                            )
                        }

                        if (parsed.content) {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId
                                        ? { ...m, content: m.content + parsed.content }
                                        : m
                                )
                            )
                        }
                    } catch {
                        // Skip invalid JSON chunks
                    }
                }
            }

            // Refresh conversation list after sending
            fetchConversations()

        } catch (err: any) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? {
                            ...m,
                            content:
                                "Sorry, I encountered an error. Please try again.",
                        }
                        : m
                )
            )
            console.error("Agent chat error:", err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // ─── Helpers ────────────────────────────────────────────────

    function formatTimeAgo(dateStr: string): string {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    // ─── Trigger Button (FAB) ───────────────────────────────────
    if (!isOpen) {
        return (
            <button
                id="agent-chat-trigger"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-50
                   flex h-14 w-14 items-center justify-center gap-2 rounded-2xl md:h-auto md:w-auto md:rounded-full
                   bg-gradient-to-r from-sky-500 to-blue-600
                   text-white shadow-lg shadow-sky-500/25 md:px-4 md:py-3
                   transition-all duration-300
                   hover:shadow-xl hover:shadow-sky-500/30 hover:scale-105
                   active:scale-95"
                title="Open AI Assistant"
            >
                <Sparkles className="h-6 w-6 md:h-5 md:w-5" />
                <span className="text-sm font-semibold hidden sm:inline">AI Assistant</span>
            </button>
        )
    }

    // ─── Chat Panel ─────────────────────────────────────────────
    return (
        <div
            id="agent-chat-panel"
            className={`fixed inset-x-0 top-0 bottom-0 z-[80] md:inset-auto md:bottom-4 md:right-4 md:z-50
                 flex flex-col
                 w-full h-[100dvh] md:max-h-[90vh]
                 rounded-none md:rounded-2xl
                 border-0 border-border bg-card md:border
                 shadow-2xl shadow-black/10
                 overflow-hidden transition-all duration-300
                 ${isExpanded 
                     ? "md:w-[800px] md:h-[800px] md:max-w-[70vw]" 
                     : "md:w-[420px] md:h-[600px] md:max-h-[80vh]"
                 }`}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-sky-500/10 to-blue-500/5 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:py-3">
                <div className="flex items-center gap-2.5">
                    {panelView === "conversations" ? (
                        <button
                            onClick={() => setPanelView("chat")}
                            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted md:h-8 md:w-8"
                            title="Back to chat"
                        >
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        </button>
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm shadow-sky-500/20 md:h-8 md:w-8 md:rounded-full">
                            <Bot className="h-5 w-5 text-white md:h-4 md:w-4" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-[17px] font-[750] leading-tight tracking-tight text-foreground md:text-sm md:font-semibold">
                            {panelView === "conversations" ? "Conversations" : "AI Assistant"}
                        </h3>
                        <p className="mt-0.5 max-w-[210px] truncate text-[12px] leading-tight text-muted-foreground md:mt-0 md:max-w-none md:text-[11px]">
                            {panelView === "conversations"
                                ? `${conversations.length} chat${conversations.length !== 1 ? "s" : ""}`
                                : activeConversationId
                                    ? conversations.find(c => c.id === activeConversationId)?.title || "Chat"
                                    : "New conversation"
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {panelView === "chat" && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                                onClick={() => setPanelView("conversations")}
                                title="View conversations"
                            >
                                <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                                onClick={handleNewChat}
                                title="New chat"
                            >
                                <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
                            </Button>
                        </>
                    )}
                    {panelView === "conversations" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                            onClick={handleNewChat}
                            title="New chat"
                        >
                            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hidden md:flex"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ── Conversations List View ── */}
            {panelView === "conversations" && (
                <div className="flex-1 overflow-y-auto">
                    {isLoadingConversations ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted md:h-12 md:w-12">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="mb-3 text-[15px] font-medium text-muted-foreground md:text-sm">No conversations yet</p>
                            <button
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600
                                       min-h-11 px-4 py-2 text-sm font-semibold text-white shadow-sm md:min-h-0 md:text-xs md:font-medium
                                       hover:shadow-md transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Start a new chat
                            </button>
                        </div>
                    ) : (
                        <div className="py-1">
                            {conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`group flex min-h-[64px] items-center gap-3 px-4 py-3 md:min-h-0
                                        cursor-pointer transition-colors
                                        hover:bg-muted/60
                                        ${activeConversationId === conv.id
                                            ? "bg-sky-500/8 border-l-2 border-sky-500"
                                            : "border-l-2 border-transparent"
                                        }`}
                                    onClick={() => loadConversation(conv.id)}
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted md:h-8 md:w-8 md:rounded-lg">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground md:h-3.5 md:w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-[15px] font-semibold text-foreground md:text-sm md:font-medium">
                                            {conv.title}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground md:mt-0 md:text-[11px]">
                                            <Clock className="h-3 w-3" />
                                            {formatTimeAgo(conv.updated_at)}
                                        </div>
                                    </div>
                                    <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity
                                               p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            archiveConversation(conv.id)
                                        }}
                                        title="Delete conversation"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Scope Clarification Inline View ── */}
            {panelView === "scope" && (() => {
                const q = scopeQuestions[scopeStep]
                const isLast = scopeStep === scopeQuestions.length - 1
                const fireSkipAll = async () => {
                    try { await api.skipScopeSession(
                        (scopeTrigger === "estimate" ? estimateContext.projectId : proposalContext.projectId) as number
                    ) } catch { /* non-critical */ }
                    setPanelView("chat")
                    if (scopeTrigger === "estimate") _fireEstimate(null)
                    else _fireProposal(null)
                }
                const fireSubmit = async () => {
                    const pid = (scopeTrigger === "estimate" ? estimateContext.projectId : proposalContext.projectId) as number
                    setScopeSubmitting(true)
                    try {
                        const answerList = scopeQuestions.map((sq) => ({
                            ...(scopeAnswers[sq.id] ?? {}),
                            question_id: sq.id,
                        }))
                        const scope = await api.submitScopeAnswers(pid, {
                            answers: answerList,
                            questions: scopeQuestions,
                            trigger: scopeTrigger,
                        })
                        setPanelView("chat")
                        if (scopeTrigger === "estimate") _fireEstimate(scope)
                        else _fireProposal(scope)
                    } catch {
                        setPanelView("chat")
                        if (scopeTrigger === "estimate") _fireEstimate(null)
                        else _fireProposal(null)
                    } finally {
                        setScopeSubmitting(false)
                    }
                }
                return (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Header: title + progress dots */}
                        <div className="px-4 pt-4 pb-3 border-b border-border">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-foreground">Clarify Scope</p>
                                {scopeQuestions.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {scopeStep + 1} / {scopeQuestions.length}
                                    </span>
                                )}
                            </div>
                            {/* Progress bar */}
                            {scopeQuestions.length > 0 && (
                                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-sky-500 rounded-full transition-all duration-300"
                                        style={{ width: `${((scopeStep + 1) / scopeQuestions.length) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Question body */}
                        <div className="flex-1 overflow-y-auto px-4 py-5">
                            {scopeLoading && (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">Analyzing project context…</span>
                                </div>
                            )}
                            {!scopeLoading && q && (
                                <div className="space-y-3">
                                    <p className="text-sm font-medium leading-snug text-foreground">
                                        {q.text}
                                        {q.type === "multi_select" && (
                                            <span className="text-muted-foreground font-normal"> (select all that apply)</span>
                                        )}
                                    </p>
                                    {q.type === "multi_select" && q.options && (
                                        <div className="space-y-3">
                                            {q.options.map((opt, oi) => {
                                                const selected = scopeAnswers[q.id]?.selected_options?.includes(opt.id) ?? false
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setScopeAnswers((prev) => {
                                                            const existing = prev[q.id] ?? { question_id: q.id, selected_options: [] }
                                                            const sel = existing.selected_options ?? []
                                                            const next = sel.includes(opt.id) ? sel.filter((id) => id !== opt.id) : [...sel, opt.id]
                                                            return { ...prev, [q.id]: { ...existing, selected_options: next } }
                                                        })}
                                                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                                            selected
                                                                ? "border-sky-500 bg-sky-500/8"
                                                                : "border-border bg-card hover:bg-muted/50"
                                                        }`}
                                                    >
                                                        <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${
                                                            selected ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground"
                                                        }`}>
                                                            {["A","B","C","D"][oi] ?? oi + 1}
                                                        </span>
                                                        <span className="text-sm text-foreground">{opt.label}</span>
                                                    </button>
                                                )
                                            })}
                                            <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3">
                                                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                    Something else?
                                                </p>
                                                <textarea
                                                    placeholder="Add anything not covered by the options above…"
                                                    rows={3}
                                                    value={scopeAnswers[q.id]?.free_text ?? ""}
                                                    onChange={(e) => setScopeAnswers((prev) => {
                                                        const existing = prev[q.id] ?? { question_id: q.id, selected_options: [] }
                                                        return {
                                                            ...prev,
                                                            [q.id]: { ...existing, free_text: e.target.value },
                                                        }
                                                    })}
                                                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {q.type === "free_text" && (
                                        <textarea
                                            placeholder="Type your answer…"
                                            rows={3}
                                            value={scopeAnswers[q.id]?.free_text ?? ""}
                                            onChange={(e) => setScopeAnswers((prev) => ({
                                                ...prev,
                                                [q.id]: { question_id: q.id, free_text: e.target.value },
                                            }))}
                                            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer: back / skip-question / next-or-submit */}
                        <div className="px-4 py-3 border-t border-border bg-card flex items-center justify-between gap-2">
                            {/* Left: Back (hidden on first) or skip-all */}
                            <div className="flex items-center gap-3">
                                {scopeStep > 0 ? (
                                    <button
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => setScopeStep((s) => s - 1)}
                                        disabled={scopeSubmitting}
                                    >
                                        Back
                                    </button>
                                ) : (
                                    <button
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                                        disabled={scopeSubmitting}
                                        onClick={fireSkipAll}
                                    >
                                        Skip all
                                    </button>
                                )}
                            </div>

                            {/* Right: skip-this / next-or-submit */}
                            <div className="flex items-center gap-2">
                                {!isLast && (
                                    <button
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                                        disabled={scopeSubmitting || scopeLoading}
                                        onClick={() => setScopeStep((s) => s + 1)}
                                    >
                                        Skip
                                    </button>
                                )}
                                <button
                                    disabled={scopeLoading || scopeSubmitting || scopeQuestions.length === 0}
                                    onClick={isLast ? fireSubmit : () => setScopeStep((s) => s + 1)}
                                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600
                                               px-4 py-2 text-sm font-semibold text-white shadow-sm
                                               hover:shadow-md transition-all disabled:opacity-40 disabled:shadow-none"
                                >
                                    {scopeSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {isLast ? "Submit & Generate" : "Next →"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ── Quote Estimate Context (shown on quote pages) ── */}
            {panelView === "chat" && isOnQuotePage && (
                <div className="border-b border-border bg-muted/30">
                    <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                        onClick={() => setContextExpanded((v) => !v)}
                    >
                        <div className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-sky-500" />
                            <span className="text-xs font-semibold text-foreground">Project Context</span>
                            {estimateContextSummary && (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                                    {estimateContextSummary}
                                </span>
                            )}
                        </div>
                        {contextExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                    </button>
                    {contextExpanded && (
                        <div className="px-4 pb-3 space-y-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Project Type (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={estimateContext.projectType}
                                    onChange={(e) => setEstimateContext((prev) => ({ ...prev, projectType: e.target.value }))}
                                    placeholder="e.g., Patio Installation, Deck Construction"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Project Description
                                </label>
                                <textarea
                                    value={estimateContext.serviceDescription}
                                    onChange={(e) => setEstimateContext((prev) => ({ ...prev, serviceDescription: e.target.value }))}
                                    placeholder="Describe the project (materials, labor, installation, etc.)"
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                />
                            </div>
                            <label className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={estimateContext.includeProjectBriefInContext ?? true}
                                    onChange={(e) => setEstimateContext((prev) => ({ ...prev, includeProjectBriefInContext: e.target.checked }))}
                                    className="h-3.5 w-3.5 rounded border-gray-300 accent-sky-600"
                                />
                                Include project brief in context
                            </label>
                            {!estimateContext.projectBrief && (
                                <p className="text-[11px] text-muted-foreground/80">
                                    No project brief loaded yet for this quote.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Proposal Context (shown on proposal builder pages) ── */}
            {panelView === "chat" && isOnProposalPage && (
                <div className="border-b border-border bg-muted/30">
                    <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                        onClick={() => setProposalContextExpanded((v) => !v)}
                    >
                        <div className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-violet-500" />
                            <span className="text-xs font-semibold text-foreground">Proposal Context</span>
                            {(proposalContext.proposalTitle || proposalContext.projectTitle || proposalContext.description) && (
                                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                                    filled
                                </span>
                            )}
                        </div>
                        {proposalContextExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                    </button>
                    {proposalContextExpanded && (
                        <div className="px-4 pb-3 space-y-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Proposal Title
                                </label>
                                <input
                                    type="text"
                                    value={proposalContext.proposalTitle}
                                    onChange={(e) => setProposalContext((prev) => ({ ...prev, proposalTitle: e.target.value }))}
                                    placeholder="e.g., Backyard Renovation Proposal"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Project
                                </label>
                                <input
                                    type="text"
                                    value={proposalContext.projectTitle}
                                    onChange={(e) => setProposalContext((prev) => ({ ...prev, projectTitle: e.target.value }))}
                                    placeholder="Project name"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Description
                                </label>
                                <textarea
                                    value={proposalContext.description}
                                    onChange={(e) => setProposalContext((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe the scope, goals, and approach"
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                />
                            </div>
                            {proposalContext.projectBrief && (
                                <label className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={proposalContext.includeProjectBriefInContext ?? true}
                                        onChange={(e) => setProposalContext((prev) => ({ ...prev, includeProjectBriefInContext: e.target.checked }))}
                                        className="h-3.5 w-3.5 rounded border-gray-300 accent-violet-600"
                                    />
                                    Include project brief in context
                                </label>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Messages (Chat View) ── */}
            {panelView === "chat" && (
                <>
                    <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-5 pt-4 md:py-3">
                        {generationStatus && (
                            <div className={`rounded-2xl border px-4 py-3 shadow-sm ${
                                generationStatus.phase === "failed"
                                    ? "border-red-200 bg-red-50/90"
                                    : generationStatus.phase === "succeeded"
                                        ? "border-emerald-200 bg-emerald-50/90"
                                        : "border-sky-200 bg-sky-50/90"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            {generationStatus.phase === "running" ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                                            ) : generationStatus.phase === "succeeded" ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            {generationStatus.title}
                                        </div>
                                        {generationStatus.detail ? (
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                {generationStatus.detail}
                                            </p>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGenerationStatus(null)}
                                        className="rounded-full p-1 text-slate-400 transition hover:bg-white/80 hover:text-slate-700"
                                        aria-label="Dismiss generation status"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {isOnQuotePage &&
                            chatLaunchMode === "quote_estimate" &&
                            messages.length === 0 &&
                            !(generationStatus?.kind === "estimate" && generationStatus.phase !== "failed") && (
                            <div className="rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.98),rgba(239,246,255,0.98))] p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900">Create AI Estimate</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-700">{estimateActionSentence}</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">{estimateContextNeedsDetail}</p>
                                        {estimateContextSummary ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-medium text-sky-700">
                                                    {estimateContextSummary}
                                                </span>
                                                {estimateContext.projectBrief ? (
                                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                        Project brief loaded
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleGenerateEstimate()}
                                                disabled={isLoading || estimateLoading || !quoteEstimateReady}
                                                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {estimateLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Zap className="h-4 w-4" />
                                                )}
                                                Generate Estimate
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setContextExpanded(true)}
                                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                            >
                                                Edit Context
                                            </button>
                                        </div>
                                        {!quoteEstimateReady ? (
                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                Add at least a short project description before generating.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && !(isOnQuotePage && chatLaunchMode === "quote_estimate") && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-sky-500/15 to-blue-600/15 md:h-14 md:w-14 md:rounded-2xl">
                                    <Sparkles className="h-8 w-8 text-sky-600 md:h-7 md:w-7" />
                                </div>
                                <h4 className="mb-1.5 text-[20px] font-[760] tracking-tight text-foreground md:text-sm md:font-semibold">
                                    How can I help?
                                </h4>
                                <p className="mb-4 max-w-[280px] text-[14px] leading-5 text-muted-foreground md:mb-3 md:max-w-[260px] md:text-xs">
                                    I can look up your leads, clients, quotes, projects, calendar, and more.
                                </p>

                                {/* ── Quick Action Buttons ── */}
                                {isOnQuotePage && chatLaunchMode !== "quote_estimate" ? (
                                    <div className="mb-4 w-full max-w-[330px] md:max-w-[300px]">
                                        <button
                                            onClick={() => {
                                                const hasContext = estimateContext.projectType?.trim() || estimateContext.serviceDescription?.trim()
                                                if (hasContext) {
                                                    handleGenerateEstimate()
                                                } else {
                                                    setContextExpanded(true)
                                                }
                                            }}
                                            disabled={isLoading || estimateLoading}
                                            className="flex w-full items-center justify-center gap-2
                                                rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/15 to-blue-600/15
                                                min-h-12 px-4 py-2.5 text-[13px] font-semibold text-sky-700 dark:text-sky-400 md:min-h-0 md:text-xs md:font-medium
                                                transition-all hover:shadow-md hover:shadow-sky-500/10 hover:border-sky-500/50
                                                hover:scale-[1.02] active:scale-[0.98]
                                                disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {estimateLoading ? (
                                                <Loader2 className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" />
                                            ) : (
                                                <Zap className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                            )}
                                            Generate AI Estimate
                                        </button>
                                    </div>
                                ) : isOnProposalPage ? (
                                    <div className="mb-4 w-full max-w-[330px] md:max-w-[300px]">
                                        <button
                                            onClick={() => {
                                                const hasContext = proposalContext.proposalTitle?.trim() || proposalContext.description?.trim()
                                                if (hasContext) {
                                                    handleGenerateProposal()
                                                } else {
                                                    setProposalContextExpanded(true)
                                                }
                                            }}
                                            disabled={isLoading || proposalLoading}
                                            className="flex w-full items-center justify-center gap-2
                                                rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-fuchsia-600/15
                                                min-h-12 px-4 py-2.5 text-[13px] font-semibold text-violet-700 dark:text-violet-400 md:min-h-0 md:text-xs md:font-medium
                                                transition-all hover:shadow-md hover:shadow-violet-500/10 hover:border-violet-500/50
                                                hover:scale-[1.02] active:scale-[0.98]
                                                disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {proposalLoading ? (
                                                <Loader2 className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" />
                                            ) : (
                                                <Zap className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                            )}
                                            Generate AI Proposal
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-4 flex w-full max-w-[330px] gap-2 md:max-w-[300px]">
                                        <button
                                            onClick={() => handleQuickAction("Good morning! Give me my daily briefing.")}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5
                                                rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10
                                                min-h-12 px-3 py-2.5 text-[13px] font-semibold text-amber-700 dark:text-amber-400 md:min-h-0 md:text-xs md:font-medium
                                                transition-all hover:shadow-md hover:shadow-amber-500/10 hover:border-amber-500/40
                                                hover:scale-[1.02] active:scale-[0.98]
                                                disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            <Sun className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                            Morning Briefing
                                        </button>
                                        <button
                                            onClick={() => handleQuickAction("What should I follow up on today?")}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5
                                                rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/10
                                                min-h-12 px-3 py-2.5 text-[13px] font-semibold text-sky-700 dark:text-sky-400 md:min-h-0 md:text-xs md:font-medium
                                                transition-all hover:shadow-md hover:shadow-sky-500/10 hover:border-sky-500/40
                                                hover:scale-[1.02] active:scale-[0.98]
                                                disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            <BellRing className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                            Follow-Ups
                                        </button>
                                    </div>
                                )}

                                <div className="flex max-w-[340px] flex-wrap justify-center gap-2 md:max-w-none md:gap-1.5">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setChatLaunchMode("general")
                                                setInput(suggestion)
                                                setTimeout(() => inputRef.current?.focus(), 50)
                                            }}
                                            className="min-h-9 rounded-full border border-border px-3.5 py-1.5
                                     text-[13px] font-medium text-muted-foreground md:min-h-0 md:px-3 md:text-xs md:font-normal
                                     transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed md:max-w-[85%] md:text-sm ${msg.role === "user"
                                        ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-br-md"
                                        : "bg-muted text-foreground rounded-bl-md"
                                        }`}
                                >
                                    {msg.role === "assistant" && (
                                        <>
                                            {/* ── Process Steps Trail ── */}
                                            {msg.processSteps && msg.processSteps.length > 0 && (
                                                <div className="flex flex-col gap-1.5 mb-2 pb-2 border-b border-border/50">
                                                    {msg.processSteps.map((ps, idx) => {
                                                        const isLast = idx === msg.processSteps!.length - 1
                                                        const isActive = isLast && isLoading && !msg.content
                                                        const colorClass = getEntityColorClass(ps.tool || "")
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`flex items-center gap-2 text-[12px] transition-all ${
                                                                    isActive
                                                                        ? `${colorClass || "text-sky-500"} font-medium`
                                                                        : "text-muted-foreground/60"
                                                                }`}
                                                            >
                                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                                                    isActive
                                                                        ? `${colorClass ? colorClass.replace("text-", "bg-").replace("-500", "-500/15 border border-") + "-500/40" : "bg-sky-500/15 border border-sky-500/40 text-sky-500"}`
                                                                        : "bg-muted text-muted-foreground"
                                                                }`}>
                                                                    {isActive
                                                                        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                                        : "✓"
                                                                    }
                                                                </span>
                                                                <span>{ps.step}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* ── No content yet, show thinking ── */}
                                            {!msg.content && isLoading && (!msg.processSteps || msg.processSteps.length === 0) && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    <span className="text-xs">Thinking...</span>
                                                </div>
                                            )}

                                            {/* ── Markdown Content ── */}
                                            {msg.content && (
                                                <div className="break-words">
                                                    <ReactMarkdown
                                                        components={{
                                                            ul: ({ ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                                                            ol: ({ ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                                                            li: ({ children, ...props }) => (
                                                                <li className="mb-1" {...props}>
                                                                    {React.Children.map(children, (child) => {
                                                                        if (typeof child === "string") {
                                                                            return colorizeStatusText(child)
                                                                        }
                                                                        return child
                                                                    })}
                                                                </li>
                                                            ),
                                                            p: ({ ...props }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                                                            h1: ({ ...props }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0" {...props} />,
                                                            h2: ({ ...props }) => <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0 text-foreground/90" {...props} />,
                                                            h3: ({ ...props }) => <h3 className="text-xs font-bold mb-1 mt-2 first:mt-0 text-foreground/80 uppercase tracking-wide" {...props} />,
                                                            a: ({ href, children, ...props }) => {
                                                                const internalPath = href
                                                                    ? href.startsWith("/")
                                                                        ? href
                                                                        : (() => {
                                                                            try {
                                                                                const url = new URL(href)
                                                                                return url.pathname
                                                                            } catch {
                                                                                return null
                                                                            }
                                                                        })()
                                                                    : null

                                                                const isAppRoute = internalPath?.startsWith("/quotes/")
                                                                    || internalPath?.startsWith("/projects/")
                                                                    || internalPath?.startsWith("/clients/") || internalPath?.startsWith("/crew/")
                                                                    || internalPath?.startsWith("/leads/")
                                                                    || internalPath?.startsWith("/calendar/")

                                                                if (isAppRoute && internalPath) {
                                                                    const localePath = `/${locale}${internalPath}`
                                                                    const colorClass = getEntityColorClass(internalPath) || "text-sky-500"
                                                                    return (
                                                                        <a
                                                                            href={localePath}
                                                                            className={`underline transition-opacity cursor-pointer font-medium hover:opacity-80 ${colorClass}`}
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                setIsOpen(false)
                                                                                router.push(localePath)
                                                                            }}
                                                                            {...props}
                                                                        >
                                                                            {children}
                                                                        </a>
                                                                    )
                                                                }

                                                                return (
                                                                    <a
                                                                        className="underline hover:opacity-80 transition-opacity text-sky-500"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        href={href}
                                                                        {...props}
                                                                    >
                                                                        {children}
                                                                    </a>
                                                                )
                                                            },
                                                            strong: ({ children, ...props }) => {
                                                                // Color-code status badge keywords inline
                                                                const text = typeof children === "string" ? children : ""
                                                                const statusColors: Record<string, string> = {
                                                                    "In Progress": "text-amber-500",
                                                                    "Not Started": "text-muted-foreground",
                                                                    "Completed": "text-emerald-500",
                                                                    "Blocked": "text-red-500",
                                                                    "On Hold": "text-orange-500",
                                                                    "Overdue": "text-red-500",
                                                                    "Done": "text-emerald-500",
                                                                    "Pending": "text-amber-400",
                                                                    "Active": "text-emerald-500",
                                                                    "Inactive": "text-muted-foreground",
                                                                    "Draft": "text-sky-500",
                                                                    "Sent": "text-violet-500",
                                                                    "Accepted": "text-emerald-500",
                                                                    "Declined": "text-red-500",
                                                                    "New": "text-sky-500",
                                                                    "Converted": "text-emerald-500",
                                                                    "Lost": "text-red-500",
                                                                }
                                                                const statusColor = statusColors[text]
                                                                if (statusColor) {
                                                                    return <strong className={`font-semibold ${statusColor}`} {...props}>{children}</strong>
                                                                }
                                                                return <strong className="font-semibold" {...props}>{children}</strong>
                                                            },
                                                            code: ({ ...props }) => <code className="bg-muted/80 rounded px-1 py-0.5 text-xs font-mono" {...props} />,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {msg.role === "user" && (
                                        <span>{msg.content}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input ── */}
                    <div className="border-t border-border bg-card px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:py-2.5">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything..."
                                rows={1}
                                className="flex-1 resize-none rounded-2xl border border-border bg-muted/50
                               px-4 py-3 text-[16px] leading-5 placeholder:text-muted-foreground md:rounded-xl md:px-3.5 md:py-2.5 md:text-sm
                               focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500
                               max-h-28 scrollbar-thin"
                                style={{ minHeight: "40px" }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement
                                    target.style.height = "40px"
                                    target.style.height = Math.min(target.scrollHeight, 112) + "px"
                                }}
                            />
                            <Button
                                size="icon"
                                disabled={!input.trim() || isLoading}
                                onClick={handleSend}
                                className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 md:h-10 md:w-10 md:rounded-xl
                               text-white shadow-sm hover:shadow-md transition-all
                               disabled:opacity-40 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>

    )
}
