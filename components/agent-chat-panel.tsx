"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import {
    X, Send, Loader2, Plus,
    MessageSquare, ChevronLeft, Trash2, Clock,
    Sun, BellRing, Maximize2, Minimize2,
    ChevronDown, ChevronUp, Zap, CheckCircle2, AlertCircle,
    FolderKanban, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import ReactMarkdown from "react-markdown"
import { api } from "@/lib/api"
import type { ScopeClarifiedScope, ScopeQuestion, ScopeQuestionAnswer } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { ProjectListItem } from "@/lib/types"
import type { AppNotification } from "@/lib/types/notification"
import { agUiState } from "@/lib/ag-ui-state"
import { WelcomeActions } from "@/components/agent-chat/welcome-actions"
import { SideViews } from "@/components/agent-chat/side-views"
import { AgentActionCard } from "@/components/agent-action-card"
import {
    type QuoteEstimateContext,
    type ProposalContext,
    type AIGenerationStatus,
    API_URL,
    type PageContext,
    type QuotePageContext,
    type ContextEnvelope,
    type SelectedProjectContext,
    type PendingProjectContextSwitch,
    preferProjectScope,
    enrichPageContext,
    pageTypeToEntityType,
    buildPreloadedSnapshot,
    buildContextEnvelope,
    DETAIL_ROUTES,
    LIST_ROUTES,
    parsePageContext,
    parseProjectRouteId,
    type ProcessStep,
    type ActionCardOption,
    type ActionCard,
    type Message,
    type Conversation,
    type PanelView,
    type ChatLaunchMode,
} from "@/lib/agent-chat-context"
export type { Message, ActionCard, ActionCardOption } from "@/lib/agent-chat-context"


const SUGGESTION_COUNTS: Record<string, number> = {"client_detail": 4, "lead_detail": 4, "project_detail": 4, "proposal_builder": 4, "quote_detail": 4, "subcontractor_detail": 3, "contacts": 4, "leads": 4, "projects": 4, "quotes": 4, "calendar": 4, "default": 5}

// ─── Types ─────────────────────────────────────────────────────


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
    const t = useTranslations("dashboard")
    const tRef = useRef(t)
    tRef.current = t
    const pathname = usePathname()
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [selectedContext, setSelectedContext] = useState<SelectedProjectContext | null>(null)
    const [pendingProjectSwitch, setPendingProjectSwitch] = useState<PendingProjectContextSwitch | null>(null)
    const [projectPickerOpen, setProjectPickerOpen] = useState(false)
    const [availableProjects, setAvailableProjects] = useState<ProjectListItem[]>([])
    const [projectsLoading, setProjectsLoading] = useState(false)
    const [projectsLoaded, setProjectsLoaded] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const pendingTextRef = useRef<string>("")
    const rafFlushId = useRef<number | null>(null)
    const rafScrollId = useRef<number | null>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const dismissedAutoProjectIdRef = useRef<number | null>(null)
    const keptProjectRouteIdRef = useRef<number | null>(null)
    const [executingCommandId, setExecutingCommandId] = useState<string | number | null>(null)
    const executingCommandRef = useRef<string | number | null>(null)
    const lastRunIdRef = useRef<string | null>(null)
    const recoveryInFlightRef = useRef<Promise<any> | null>(null)

    // Multi-chat state
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
    const [panelView, setPanelView] = useState<PanelView>("chat")
    const [isLoadingConversations, setIsLoadingConversations] = useState(false)
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [unreadNotifications, setUnreadNotifications] = useState(0)
    const [notificationsLoading, setNotificationsLoading] = useState(false)
    const [notificationsError, setNotificationsError] = useState(false)

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
        includeLineItemsInContext: true,
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

    const routeProjectId = useMemo(
        () => parseProjectRouteId(pathname ?? ""),
        [pathname]
    )

    useEffect(() => {
        if (keptProjectRouteIdRef.current != null && keptProjectRouteIdRef.current !== routeProjectId) {
            keptProjectRouteIdRef.current = null
        }
        if (dismissedAutoProjectIdRef.current != null && dismissedAutoProjectIdRef.current !== routeProjectId) {
            dismissedAutoProjectIdRef.current = null
        }
        if (pendingProjectSwitch && pendingProjectSwitch.projectId !== routeProjectId) {
            setPendingProjectSwitch(null)
        }
    }, [pendingProjectSwitch, routeProjectId])

    // Parse page context from current route; quote detail enriches from loaded job on the page
    const pageContext = useMemo(
        () => enrichPageContext(parsePageContext(pathname ?? ""), locale, estimateContext, proposalContext),
        [pathname, locale, quotePageCtxTick, estimateContext, proposalContext]
    )
    const fallbackProjectContext = useMemo(() => {
        if (proposalContext.projectId) {
            return {
                projectId: proposalContext.projectId,
                projectName: proposalContext.projectTitle?.trim() || t("assistant.picker.current"),
            }
        }
        if (estimateContext.projectId) {
            return {
                projectId: estimateContext.projectId,
                projectName:
                    estimateContext.projectTitle?.trim()
                    || estimateContext.projectType?.trim()
                    || t("assistant.picker.current"),
            }
        }
        return null
    }, [
        estimateContext.projectId,
        estimateContext.projectTitle,
        estimateContext.projectType,
        proposalContext.projectId,
        proposalContext.projectTitle,
    ])
    const activeProjectId = useMemo(() => {
        if (selectedContext?.projectId) return selectedContext.projectId
        if (
            routeProjectId
            && dismissedAutoProjectIdRef.current !== routeProjectId
            && keptProjectRouteIdRef.current !== routeProjectId
        ) {
            return routeProjectId
        }
        if (fallbackProjectContext?.projectId) return fallbackProjectContext.projectId
        return null
    }, [fallbackProjectContext?.projectId, routeProjectId, selectedContext?.projectId])
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
    const suggestionPage = pageContext.page in SUGGESTION_COUNTS ? pageContext.page : "default"
    const suggestions = Array.from({ length: SUGGESTION_COUNTS[suggestionPage] }, (_, n) =>
        t(`assistant.suggest.${suggestionPage}.${n}`))
    const selectedProjectLabel = selectedContext
        ? `project: ${selectedContext.projectName}`
        : null

    const loadNotifications = useCallback(async () => {
        setNotificationsLoading(true)
        setNotificationsError(false)
        try {
            const result = await api.getNotifications()
            setNotifications(result.items)
            setUnreadNotifications(result.unread_count)
        } catch {
            setNotificationsError(true)
        } finally {
            setNotificationsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        void loadNotifications()
        const timer = window.setInterval(loadNotifications, 30_000)
        return () => window.clearInterval(timer)
    }, [isOpen, loadNotifications])

    const openNotification = useCallback(async (notification: AppNotification) => {
        if (!notification.read_at) {
            try {
                await api.markNotificationRead(notification.id)
                setNotifications((current) => current.map((item) =>
                    item.id === notification.id
                        ? { ...item, read_at: new Date().toISOString() }
                        : item
                ))
                setUnreadNotifications((count) => Math.max(0, count - 1))
            } catch {}
        }
        if (notification.action_url) {
            router.push(`/${locale}${notification.action_url}`)
            setIsOpen(false)
        }
    }, [locale, router])

    const markAllNotificationsRead = useCallback(async () => {
        try {
            await api.markAllNotificationsRead()
            const readAt = new Date().toISOString()
            setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })))
            setUnreadNotifications(0)
        } catch {}
    }, [])

    const deleteNotification = useCallback(async (notification: AppNotification) => {
        try {
            await api.deleteNotification(notification.id)
            setNotifications((current) => current.filter((item) => item.id !== notification.id))
            if (!notification.read_at) {
                setUnreadNotifications((count) => Math.max(0, count - 1))
            }
        } catch {}
    }, [])

    // Detect if we're on a quote create/edit page
    const isOnQuotePage = useMemo(() => {
        const stripped = (pathname ?? "").replace(/^\/[a-z]{2}/, "")
        return stripped === "/quotes/new" || /^\/quotes\/\d+\/edit$/.test(stripped)
    }, [pathname])

    // Detect if we're on a proposal builder page
    const isOnProposalPage = useMemo(() => {
        const stripped = (pathname ?? "").replace(/^\/[a-z]{2}/, "")
        return /^\/projects\/\d+\/proposals\/\d+$/.test(stripped) || /^\/quotes\/\d+\/proposal$/.test(stripped)
    }, [pathname])
    const isOnQuoteProposalPage = useMemo(() => {
        const stripped = (pathname ?? "").replace(/^\/[a-z]{2}/, "")
        return /^\/quotes\/\d+\/proposal$/.test(stripped)
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

    const isNearBottom = useCallback(() => {
        const el = scrollContainerRef.current
        if (!el) return true
        return el.scrollHeight - el.scrollTop - el.clientHeight < 120
    }, [])

    const scrollToBottom = useCallback((instant = false) => {
        if (!isNearBottom()) return
        if (rafScrollId.current !== null) return
        rafScrollId.current = requestAnimationFrame(() => {
            rafScrollId.current = null
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth" })
            }
        })
    }, [isNearBottom])

    const flushPendingText = useCallback((targetId: string) => {
        const textToFlush = pendingTextRef.current
        if (!textToFlush) return
        pendingTextRef.current = ""
        setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last && last.id === targetId) {
                return [...prev.slice(0, -1), { ...last, content: last.content + textToFlush }]
            }
            return prev.map((m) =>
                m.id === targetId ? { ...m, content: m.content + textToFlush } : m
            )
        })
        scrollToBottom(true)
    }, [scrollToBottom])

    useEffect(() => {
        if (!isLoading) {
            scrollToBottom(false)
        }
    }, [messages.length, isLoading, scrollToBottom])

    useEffect(() => {
        if (isOpen && inputRef.current && panelView === "chat") {
            inputRef.current.focus()
        }
    }, [isOpen, panelView])

    useEffect(() => {
        if (!projectPickerOpen || projectsLoaded || projectsLoading) return
        let cancelled = false
        const run = async () => {
            try {
                setProjectsLoading(true)
                const data = await api.getProjectContextOptions({ limit: 200, skip: 0 })
                if (cancelled) return
                const normalizedProjects = Array.isArray(data)
                    ? data as ProjectListItem[]
                    : Array.isArray((data as { projects?: unknown })?.projects)
                        ? ((data as { projects: ProjectListItem[] }).projects)
                        : []
                setAvailableProjects(normalizedProjects)
                setProjectsLoaded(true)
            } catch (err) {
                console.error("Failed to load projects for chat context:", err)
                if (!cancelled) setProjectsLoaded(true)
            } finally {
                if (!cancelled) setProjectsLoading(false)
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [projectPickerOpen, projectsLoaded]) // projectsLoading intentionally excluded: including it causes the effect to cancel itself mid-flight

    useEffect(() => {
        if (!routeProjectId) return
        if (dismissedAutoProjectIdRef.current === routeProjectId) return
        if (keptProjectRouteIdRef.current === routeProjectId) return

        let cancelled = false
        const run = async () => {
            try {
                const project = await api.getProject(routeProjectId) as { id: number; title?: string | null }
                if (cancelled || !project?.id) return
                const nextContext: SelectedProjectContext = {
                    type: "project",
                    projectId: project.id,
                    projectName: project.title?.trim() || t("assistant.picker.projectNumber", { id: project.id }),
                    source: "auto",
                }

                setSelectedContext((current) => {
                    if (!current) {
                        setPendingProjectSwitch(null)
                        return nextContext
                    }
                    if (current.source === "manual" && current.projectId !== nextContext.projectId) {
                        return current
                    }
                    if (current.projectId === nextContext.projectId) {
                        if (current.projectName !== nextContext.projectName || current.source !== "auto") {
                            return { ...current, projectName: nextContext.projectName, source: "auto" }
                        }
                        return current
                    }
                    if (messages.length === 0) {
                        setPendingProjectSwitch(null)
                        return nextContext
                    }
                    setPendingProjectSwitch((existing) => {
                        if (
                            existing?.projectId === nextContext.projectId
                            && existing.projectName === nextContext.projectName
                        ) {
                            return existing
                        }
                        return {
                            projectId: nextContext.projectId,
                            projectName: nextContext.projectName,
                            source: "auto",
                        }
                    })
                    return current
                })
            } catch (err) {
                console.error("Failed to load project context:", err)
            }
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [messages.length, routeProjectId])

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

    const estimateClientPrompt = useMemo(() => {
        const client = estimateContext.clientName?.trim()
        return client ? t("assistant.banner.estimateFor", { client }) : t("assistant.banner.estimateClient")
    }, [estimateContext.clientName, t])

    const estimateProjectPrompt = useMemo(() => {
        const project = estimateContext.projectTitle?.trim() || estimateContext.projectType?.trim()
        if (project && estimateContext.projectBrief) return t("assistant.banner.briefNamed", { project })
        if (project) return project
        if (estimateContext.projectBrief) return t("assistant.banner.brief")
        return ""
    }, [
        estimateContext.projectBrief,
        estimateContext.projectTitle,
        estimateContext.projectType,
    ])

    const proposalClientPrompt = useMemo(() => {
        const proposal = proposalContext.proposalTitle?.trim()
        const project = proposalContext.projectTitle?.trim()

        if (proposal) return t("assistant.banner.proposalFor", { name: proposal })
        if (isOnQuoteProposalPage) return t("assistant.banner.proposalQuote")
        if (project) return t("assistant.banner.proposalFor", { name: project })
        return t("assistant.banner.proposalProject")
    }, [isOnQuoteProposalPage, proposalContext.projectTitle, proposalContext.proposalTitle])

    const proposalProjectPrompt = useMemo(() => {
        const project = proposalContext.projectTitle?.trim() || proposalContext.proposalTitle?.trim()
        if (project && proposalContext.projectBrief) return t("assistant.banner.briefNamed", { project })
        if (project && proposalContext.includeLineItemsInContext !== false && (proposalContext.lineItems?.length ?? 0) > 0) {
            return t("assistant.banner.lineItemsNamed", { project })
        }
        if (project && !isOnQuoteProposalPage) return project
        if (proposalContext.projectBrief) return t("assistant.banner.brief")
        if (proposalContext.includeLineItemsInContext !== false && (proposalContext.lineItems?.length ?? 0) > 0) {
            return t("assistant.banner.lineItems")
        }
        return ""
    }, [
        isOnQuoteProposalPage,
        proposalContext.includeLineItemsInContext,
        proposalContext.lineItems,
        proposalContext.projectBrief,
        proposalContext.projectTitle,
        proposalContext.proposalTitle,
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
            if (ctx) {
                setProposalContext({
                    ...ctx,
                    includeProjectBriefInContext: ctx.includeProjectBriefInContext ?? true,
                    includeLineItemsInContext: ctx.includeLineItemsInContext ?? true,
                })
            }
        }
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as ProposalContext
            setProposalContext({
                ...detail,
                includeProjectBriefInContext: detail.includeProjectBriefInContext ?? true,
                includeLineItemsInContext: detail.includeLineItemsInContext ?? true,
            })
        }
        syncFromWindow()
        window.addEventListener("proposal-context-updated", handler)
        return () => window.removeEventListener("proposal-context-updated", handler)
    }, [])

    // Listen for header button → open panel in proposal mode
    useEffect(() => {
        const handler = () => {
            const ctx = (window as any).proposalBuilderContext as ProposalContext | undefined
            if (ctx) {
                setProposalContext({
                    ...ctx,
                    includeProjectBriefInContext: ctx.includeProjectBriefInContext ?? true,
                    includeLineItemsInContext: ctx.includeLineItemsInContext ?? true,
                })
            }
            const isEmpty = !ctx?.proposalTitle?.trim() && !ctx?.description?.trim()
            setProposalContextExpanded(isEmpty)
            setIsOpen(true)
            setPanelView("chat")
            setChatLaunchMode("proposal")
        }
        window.addEventListener("open-ai-panel-for-proposal", handler)
        return () => window.removeEventListener("open-ai-panel-for-proposal", handler)
    }, [])

    // ─── Chat handlers ──────────────────────────────────────────

    const handleNewChat = useCallback(() => {
        setActiveConversationId(null)
        setMessages([])
        setPendingProjectSwitch(null)
        setPanelView("chat")
        setChatLaunchMode("general")
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

    const applyProjectContext = useCallback((context: SelectedProjectContext | null) => {
        setSelectedContext(context)
        setPendingProjectSwitch(null)
        if (context) {
            dismissedAutoProjectIdRef.current = null
            keptProjectRouteIdRef.current = null
        }
    }, [])

    const handleDismissSelectedContext = useCallback(() => {
        if (routeProjectId && selectedContext?.projectId === routeProjectId) {
            dismissedAutoProjectIdRef.current = routeProjectId
        }
        setPendingProjectSwitch(null)
        setSelectedContext(null)
    }, [routeProjectId, selectedContext?.projectId])

    const handleKeepCurrentProjectContext = useCallback(() => {
        if (routeProjectId) {
            keptProjectRouteIdRef.current = routeProjectId
        }
        setPendingProjectSwitch(null)
    }, [routeProjectId])

    const handleSwitchProjectContext = useCallback(() => {
        if (!pendingProjectSwitch) return
        applyProjectContext({
            type: "project",
            projectId: pendingProjectSwitch.projectId,
            projectName: pendingProjectSwitch.projectName,
            source: pendingProjectSwitch.source,
        })
        handleNewChat()
    }, [applyProjectContext, handleNewChat, pendingProjectSwitch])

    const queueProjectContextSelection = useCallback((context: SelectedProjectContext) => {
        setProjectPickerOpen(false)
        applyProjectContext(context)
    }, [applyProjectContext])

    const _fireEstimate = useCallback((scope: ScopeClarifiedScope | null) => {
        setEstimateLoading(true)
        setChatLaunchMode("quote_estimate")
        setGenerationStatus({
            kind: "estimate",
            phase: "running",
            title: tRef.current("assistant.step.estimateTitle"),
            detail: tRef.current("assistant.step.estimateDetail"),
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
            title: tRef.current("assistant.step.proposalTitle"),
            detail: tRef.current("assistant.step.proposalDetail"),
        })
        setPanelView("chat")
        setIsOpen(true)
        window.dispatchEvent(new CustomEvent("trigger-ai-proposal", {
            detail: {
                clarifiedScope: scope,
                proposalTitle: proposalContext.proposalTitle,
                projectTitle: proposalContext.projectTitle,
                description: proposalContext.description,
                includeProjectBriefInContext: proposalContext.includeProjectBriefInContext ?? true,
                includeLineItemsInContext: proposalContext.includeLineItemsInContext ?? true,
                selectedItemIds:
                    proposalContext.includeLineItemsInContext === false
                        ? []
                        : (proposalContext.lineItems ?? []).map((item) => item.id),
            },
        }))
    }, [proposalContext])

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

    const recoverAgUiRun = useCallback(async (runId: string) => {
        if (recoveryInFlightRef.current) return recoveryInFlightRef.current
        const request = api.getAgentRunRecovery(runId).then((recovery) => {
            agUiState.applyRecoveryEvents(recovery.events || [], {
                threadId: recovery.conversation_id != null ? String(recovery.conversation_id) : undefined,
                runId,
            })
            return recovery
        }).finally(() => {
            recoveryInFlightRef.current = null
        })
        recoveryInFlightRef.current = request
        return request
    }, [])

    useEffect(() => agUiState.subscribeRecovery((event) => {
        const runId = event.runId || lastRunIdRef.current
        if (!runId || (lastRunIdRef.current && runId !== lastRunIdRef.current)) return
        void recoverAgUiRun(runId).catch((error) => {
            console.error("AG-UI state recovery failed:", error)
        })
    }), [recoverAgUiRun])

    const sendChatMessage = useCallback(async (
        text: string,
        resumeOption?: { interruptId: string; status: string }
    ) => {
        const trimmed = text.trim()
        if (!trimmed || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: trimmed,
        }

        const nextHistory = [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
        }))
        const assistantId = (Date.now() + 1).toString()

        setMessages((prev) => [
            ...prev,
            userMessage,
            { id: assistantId, role: "assistant", content: "" },
        ])
        setInput("")
        setIsLoading(true)

        try {
            const res = await fetch(`${API_URL}/agent/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Agent-Protocol": "ag-ui",
                },
                credentials: "include",
                body: JSON.stringify({
                    messages: nextHistory,
                    page_context: pageContext,
                    context_envelope: {
                        ...contextEnvelope,
                        preloaded_snapshot: {
                            ...(contextEnvelope.preloaded_snapshot || {}),
                            ...agUiState.getState(),
                        },
                    },
                    conversation_id: activeConversationId || undefined,
                    project_id: activeProjectId || undefined,
                    protocol_version: "ag-ui",
                    resume: resumeOption ? [{
                        interruptId: resumeOption.interruptId,
                        status: resumeOption.status,
                    }] : undefined,
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
                    const trimmedLine = line.trim()
                    if (!trimmedLine.startsWith("data: ")) continue

                    const data = trimmedLine.slice(6)
                    if (data === "[DONE]") break

                    try {
                        const parsed = JSON.parse(data)

                        // ── AG-UI 1.0 Protocol Handling ──
                        if (parsed.type === "RUN_STARTED") {
                            if (parsed.runId) {
                                lastRunIdRef.current = parsed.runId
                            }
                            if (parsed.threadId && !activeConversationId) {
                                const parsedId = Number(parsed.threadId)
                                if (Number.isFinite(parsedId)) setActiveConversationId(parsedId)
                            }
                        } else if (parsed.type === "STATE_SNAPSHOT") {
                            if (parsed.snapshot) {
                                agUiState.applySnapshot(
                                    parsed.snapshot,
                                    parsed.revision ?? 0,
                                    parsed.threadId,
                                    parsed.runId
                                )
                            }
                        } else if (parsed.type === "STATE_DELTA") {
                            // ── AG-UI Real-Time Shared State (RFC 6902) ──
                            if (parsed.delta && Array.isArray(parsed.delta)) {
                                agUiState.applyDelta({
                                    entityType: parsed.entityType || "quote",
                                    delta: parsed.delta,
                                    revision: parsed.revision,
                                    reason: parsed.reason,
                                    threadId: parsed.threadId,
                                    runId: parsed.runId,
                                })
                            }
                        } else if (parsed.type === "TOOL_CALL_START" || parsed.type === "TOOL_CALL_STARTED") {
                            flushPendingText(assistantId)
                            const toolName = parsed.toolCallName || parsed.name
                            let stepLabel = parsed.metadata?.label
                            if (!stepLabel) {
                                if (toolName === "ui_navigate") {
                                    stepLabel = parsed.arguments?.reason || (parsed.arguments?.route ? tRef.current("assistant.step.openingRoute", { route: parsed.arguments.route }) : tRef.current("assistant.step.openingPage"))
                                } else if (toolName === "ui_open_dialog") {
                                    stepLabel = (parsed.arguments?.dialog ? tRef.current("assistant.step.openingDialog", { dialog: String(parsed.arguments.dialog).replace(/_/g, " ") }) : tRef.current("assistant.step.openingDialogGeneric"))
                                } else if (toolName === "ui_copy_to_clipboard") {
                                    stepLabel = parsed.arguments?.label || tRef.current("assistant.step.copying")
                                } else if (toolName === "ui_patch_state") {
                                    stepLabel = parsed.arguments?.reason || tRef.current("assistant.step.updatingForm")
                                } else {
                                    stepLabel = tRef.current("assistant.step.running", { tool: String(toolName) })
                                }
                            }
                            const stepId = parsed.toolCallId || parsed.id || `step-${Date.now()}`
                            const stepItem: ProcessStep = {
                                id: stepId,
                                step: stepLabel,
                                tool: toolName,
                                toolCallId: stepId,
                                status: "running",
                            }
                            setMessages((prev) => {
                                const last = prev[prev.length - 1]
                                if (last && last.id === assistantId) {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...last, processSteps: [...(last.processSteps || []), stepItem] }
                                    ]
                                }
                                return prev.map((m) => {
                                    if (m.id === assistantId) {
                                        const currentSteps = m.processSteps || []
                                        return {
                                            ...m,
                                            processSteps: [...currentSteps, stepItem]
                                        }
                                    }
                                    return m
                                })
                            })
                        } else if (parsed.type === "TOOL_CALL_END" || parsed.type === "TOOL_CALL_RESULT") {
                            flushPendingText(assistantId)
                            const stepId = parsed.toolCallId || parsed.id
                            setMessages((prev) =>
                                prev.map((m) => {
                                    if (m.id === assistantId && m.processSteps) {
                                        return {
                                            ...m,
                                            processSteps: m.processSteps.map((s) => {
                                                if (s.toolCallId === stepId || s.id === stepId) {
                                                    return {
                                                        ...s,
                                                        status: parsed.error ? "error" : "completed",
                                                    }
                                                }
                                                return s
                                            }),
                                        }
                                    }
                                    return m
                                })
                            )

                            // Check for action card or client-side action in tool result
                            const rawResult = parsed.result ?? parsed.content
                            if (rawResult) {
                                const resultObj = typeof rawResult === "string"
                                    ? (() => { try { return JSON.parse(rawResult) } catch { return null } })()
                                    : rawResult

                                if (resultObj && typeof resultObj === "object") {
                                    // 1. Client-Side Actions (AG-UI Agent UI Control)
                                    if (resultObj.client_action) {
                                        if (resultObj.action === "navigate" && typeof resultObj.route === "string") {
                                            const cleanRoute = resultObj.route.startsWith("/") ? resultObj.route : `/${resultObj.route}`
                                            const targetUrl = `/${locale}${cleanRoute}`
                                            router.push(targetUrl)
                                        } else if (resultObj.action === "copy_to_clipboard" && typeof resultObj.text === "string") {
                                            if (typeof navigator !== "undefined" && navigator.clipboard) {
                                                void navigator.clipboard.writeText(resultObj.text)
                                                toast({
                                                    title: tRef.current("assistant.action.copied"),
                                                    description: resultObj.text,
                                                })
                                            }
                                        } else if (resultObj.action === "patch_state" && Array.isArray(resultObj.delta)) {
                                            agUiState.dispatch({
                                                entityType: (resultObj.entity_type as string) || "quote",
                                                delta: resultObj.delta as any,
                                                reason: resultObj.reason as string | undefined,
                                            })
                                        }
                                    }

                                    // 2. Action Card (Confirmation / Human in the Loop)
                                    if (resultObj.action_card) {
                                        const cardData = resultObj.action_card
                                        const actionCard: ActionCard = {
                                            action: cardData.action,
                                            title: cardData.title || tRef.current("assistant.action.confirmTitle"),
                                            description: cardData.description,
                                            options: cardData.options || [
                                                { id: "confirm", label: tRef.current("assistant.action.confirm"), prompt: "Yes, proceed", style: "primary" },
                                                { id: "cancel", label: tRef.current("assistant.action.cancel"), prompt: "Cancel action", style: "secondary" },
                                            ],
                                            entity: cardData.entity,
                                            interruptId: cardData.interruptId,
                                            commandId: cardData.command_id || cardData.commandId,
                                            approvalToken: cardData.approval_token || cardData.approvalToken,
                                            status: "pending",
                                        }
                                        setMessages((prev) => {
                                            const last = prev[prev.length - 1]
                                            if (last && last.id === assistantId) {
                                                return [...prev.slice(0, -1), { ...last, actionCard }]
                                            }
                                            return prev.map((m) =>
                                                m.id === assistantId
                                                    ? { ...m, actionCard }
                                                    : m
                                            )
                                        })
                                    }

                                    // 3. Show toast on success/failure if message is present (skip for navigation)
                                    if (resultObj.message && !resultObj.client_action) {
                                        if (parsed.error || resultObj.status === "failed") {
                                            toast({
                                                title: tRef.current("assistant.action.failed"),
                                                description: resultObj.message || tRef.current("assistant.action.failedDesc"),
                                                variant: "destructive",
                                            })
                                        } else if (resultObj.status === "completed" || resultObj.success) {
                                            toast({
                                                title: tRef.current("assistant.action.completed"),
                                                description: resultObj.message,
                                            })
                                        }
                                    }
                                }
                            }
                        } else if (parsed.type === "STATE_DELTA" && Array.isArray(parsed.delta)) {
                            agUiState.dispatch({
                                entityType: (parsed.entityType as string) || "quote",
                                delta: parsed.delta as any,
                                reason: parsed.reason as string | undefined,
                            })
                        } else if (parsed.type === "TOOL_CALL_CHUNK") {
                            // Streaming tool args - can be ignored or used for progress
                        } else if (parsed.type === "TEXT_MESSAGE_CONTENT" || parsed.type === "TEXT_MESSAGE_CHUNK") {
                            if (typeof parsed.delta === "string") {
                                pendingTextRef.current += parsed.delta
                                if (rafFlushId.current === null) {
                                    rafFlushId.current = requestAnimationFrame(() => {
                                        rafFlushId.current = null
                                        flushPendingText(assistantId)
                                    })
                                }
                            }
                        } else if (parsed.type === "TEXT_MESSAGE_END") {
                            flushPendingText(assistantId)
                        } else if (parsed.type === "RUN_ERROR") {
                            flushPendingText(assistantId)
                            const errorMessage = parsed.message || tRef.current("assistant.action.runError")
                            setMessages((prev) => prev.map((m) =>
                                m.id === assistantId
                                    ? {
                                        ...m,
                                        content: m.content
                                            ? `${m.content}\n\n${errorMessage}`
                                            : errorMessage,
                                    }
                                    : m
                            ))
                        } else if (parsed.type === "RUN_FINISHED") {
                            flushPendingText(assistantId)
                            if (parsed.outcome?.type === "interrupt" && Array.isArray(parsed.outcome.interrupts) && parsed.outcome.interrupts.length > 0) {
                                const interrupt = parsed.outcome.interrupts[0]
                                const actionCard: ActionCard = {
                                    action: interrupt.metadata?.action,
                                    title: interrupt.metadata?.title || tRef.current("assistant.action.confirmTitle"),
                                    description: interrupt.message,
                                    options: interrupt.metadata?.options || [
                                        { id: "confirm", label: tRef.current("assistant.action.confirm"), prompt: "Yes, proceed", style: "primary" },
                                        { id: "cancel", label: tRef.current("assistant.action.cancel"), prompt: "Cancel action", style: "secondary" },
                                    ],
                                    entity: interrupt.metadata?.entity,
                                    interruptId: interrupt.id,
                                    commandId: interrupt.metadata?.commandId || interrupt.metadata?.command_id,
                                    approvalToken: interrupt.metadata?.approvalToken || interrupt.metadata?.approval_token,
                                    status: "pending",
                                }
                                setMessages((prev) => {
                                    const last = prev[prev.length - 1]
                                    if (last && last.id === assistantId) {
                                        return [...prev.slice(0, -1), { ...last, actionCard }]
                                    }
                                    return prev.map((m) =>
                                        m.id === assistantId
                                            ? { ...m, actionCard }
                                            : m
                                    )
                                })
                            }
                        }

                        // ── Legacy Format Handling (Fallback) ──
                        if (parsed.conversation_id && !activeConversationId) {
                            setActiveConversationId(parsed.conversation_id)
                        }

                        if (parsed.process_step) {
                            flushPendingText(assistantId)
                            setMessages((prev) => {
                                const last = prev[prev.length - 1]
                                const stepItem = { step: parsed.process_step, tool: parsed.tool }
                                if (last && last.id === assistantId) {
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...last, processSteps: [...(last.processSteps || []), stepItem] }
                                    ]
                                }
                                return prev.map((m) => {
                                    if (m.id === assistantId) {
                                        const currentSteps = m.processSteps || []
                                        return {
                                            ...m,
                                            processSteps: [...currentSteps, stepItem]
                                        }
                                    }
                                    return m
                                })
                            })
                        }

                        if (parsed.action_card) {
                            flushPendingText(assistantId)
                            const cardData = parsed.action_card as any
                            const actionCard: ActionCard = {
                                action: cardData.action,
                                title: cardData.title || tRef.current("assistant.action.confirmTitle"),
                                description: cardData.description,
                                options: cardData.options || [
                                    { id: "confirm", label: tRef.current("assistant.action.confirm"), prompt: "Yes, proceed", style: "primary" },
                                    { id: "cancel", label: tRef.current("assistant.action.cancel"), prompt: "Cancel action", style: "secondary" },
                                ],
                                entity: cardData.entity,
                                interruptId: cardData.interruptId,
                                commandId: cardData.command_id || cardData.commandId,
                                approvalToken: cardData.approval_token || cardData.approvalToken,
                                status: "pending",
                            }
                            setMessages((prev) => {
                                const last = prev[prev.length - 1]
                                if (last && last.id === assistantId) {
                                    return [...prev.slice(0, -1), { ...last, actionCard }]
                                }
                                return prev.map((m) =>
                                    m.id === assistantId
                                        ? { ...m, actionCard }
                                        : m
                                )
                            })
                        }

                        if (!parsed.type && typeof parsed.content === "string") {
                            pendingTextRef.current += parsed.content
                            if (rafFlushId.current === null) {
                                rafFlushId.current = requestAnimationFrame(() => {
                                    rafFlushId.current = null
                                    flushPendingText(assistantId)
                                })
                            }
                        }
                    } catch {
                        // Skip invalid JSON chunks
                    }
                }
            }

            fetchConversations()
        } catch (err: any) {
            flushPendingText(assistantId)
            let recovered = false
            if (lastRunIdRef.current) {
                try {
                    const recovery = await recoverAgUiRun(lastRunIdRef.current)
                    if (recovery && recovery.terminal_outcome?.type === "interrupt") {
                        const interrupt = recovery.terminal_outcome.interrupts?.[0]
                        if (interrupt) {
                            const actionCard: ActionCard = {
                                action: interrupt.metadata?.action,
                                title: interrupt.metadata?.title || tRef.current("assistant.action.confirmTitle"),
                                description: interrupt.message,
                                options: interrupt.metadata?.options || [
                                    { id: "confirm", label: tRef.current("assistant.action.confirm"), prompt: "Yes, proceed", style: "primary" },
                                    { id: "cancel", label: tRef.current("assistant.action.cancel"), prompt: "Cancel action", style: "secondary" },
                                ],
                                entity: interrupt.metadata?.entity,
                                interruptId: interrupt.id,
                                commandId: interrupt.metadata?.commandId || interrupt.metadata?.command_id,
                                approvalToken: interrupt.metadata?.approvalToken || interrupt.metadata?.approval_token,
                                status: "pending",
                            }
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId
                                        ? { ...m, actionCard, content: m.content || tRef.current("assistant.action.reviewBelow") }
                                        : m
                                )
                            )
                            recovered = true
                        }
                    }
                } catch {
                    // Recovery lookup non-fatal
                }
            }
            if (!recovered) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? {
                                ...m,
                                content: tRef.current("assistant.action.chatError"),
                            }
                            : m
                    )
                )
            }
            console.error("Agent chat error:", err)
        } finally {
            flushPendingText(assistantId)
            if (rafFlushId.current !== null) {
                cancelAnimationFrame(rafFlushId.current)
                rafFlushId.current = null
            }
            setIsLoading(false)
        }
    }, [
        activeConversationId,
        activeProjectId,
        contextEnvelope,
        fetchConversations,
        isLoading,
        messages,
        pageContext,
        recoverAgUiRun,
    ])

    const handleQuickAction = useCallback((message: string) => {
        void sendChatMessage(message)
    }, [sendChatMessage])

    const handleActionCardClick = useCallback(async (message: Message, option: ActionCardOption) => {
        const card = message.actionCard
        if (!card) return

        // Guard against duplicate clicks, concurrent requests, and already resolved cards
        if (executingCommandRef.current !== null || executingCommandId !== null) return
        if (card.status === "completed" || card.status === "approved" || card.status === "rejected") return

        const optId = (option.id || "").toLowerCase()
        const optPrompt = (option.prompt || "").toLowerCase()
        const isCancel = optId.includes("cancel") || optId.includes("reject") || optPrompt.includes("cancel") || optPrompt.includes("reject")

        if (card.commandId && card.approvalToken) {
            executingCommandRef.current = card.commandId
            setExecutingCommandId(card.commandId)
            try {
                if (isCancel) {
                    await api.rejectAgentCommand(card.commandId, card.approvalToken)
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === message.id && m.actionCard
                                ? {
                                    ...m,
                                    actionCard: {
                                        ...m.actionCard,
                                        status: "rejected",
                                    },
                                }
                                : m
                        )
                    )
                    toast({
                        title: tRef.current("assistant.action.cancelled"),
                        description: tRef.current("assistant.action.cancelledDesc"),
                    })
                } else {
                    const res = await api.approveAgentCommand(
                        card.commandId,
                        card.approvalToken,
                        card.editedPayload,
                    )
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === message.id && m.actionCard
                                ? {
                                    ...m,
                                    actionCard: {
                                        ...m.actionCard,
                                        status: String(res.status || "completed").toLowerCase() as ActionCard["status"],
                                        result: res.result,
                                        replayed: res.replayed,
                                    },
                                }
                                : m
                        )
                    )
                    toast({
                        title: res.replayed ? tRef.current("assistant.action.replayed") : tRef.current("assistant.action.approved"),
                        description: res.replayed
                            ? tRef.current("assistant.action.replayedDesc")
                            : tRef.current("assistant.action.executedDesc"),
                    })
                }
            } catch (err: any) {
                console.error("Agent command execution failed:", err)
                toast({
                    title: tRef.current("assistant.action.execError"),
                    description: err?.message || tRef.current("assistant.action.processFailed"),
                    variant: "destructive",
                })
            } finally {
                executingCommandRef.current = null
                setExecutingCommandId(null)
            }
        } else {
            void sendChatMessage(
                option.prompt,
                card.interruptId
                    ? {
                        interruptId: card.interruptId,
                        status: isCancel ? "rejected" : "approved",
                    }
                    : undefined
            )
        }
    }, [executingCommandId, sendChatMessage, toast])

    const handleSend = async () => {
        await sendChatMessage(input)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // ─── Helpers ────────────────────────────────────────────────

    // ─── Trigger Button (FAB) ───────────────────────────────────
    if (!isOpen) {
        return (
            <button
                id="agent-chat-trigger"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-50
                   flex h-14 w-14 items-center justify-center gap-2.5 rounded-2xl md:h-auto md:w-auto md:rounded-full
                   bg-gradient-to-r from-sky-500 to-blue-600
                   text-white shadow-[0_18px_45px_rgba(2,132,199,0.34)] ring-1 ring-white/35 md:pl-2.5 md:pr-4 md:py-2
                   transition-all duration-300
                   hover:scale-105 hover:shadow-[0_22px_54px_rgba(2,132,199,0.42)]
                   active:scale-95"
                title={t("assistant.view.open")}
                aria-label={t("assistant.view.open")}
            >
                <div className="flex h-9 w-9 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm p-1">
                    <img src="/bob-ai-mark.png" alt="Bob AI" className="h-full w-full object-contain" />
                </div>
                <span className="text-sm font-semibold hidden sm:inline">Bob AI</span>
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
            <div className="flex items-center justify-between gap-2 overflow-hidden border-b border-border bg-gradient-to-r from-sky-500/10 to-blue-500/5 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {panelView === "conversations" || panelView === "notifications" ? (
                        <button
                            onClick={() => setPanelView("chat")}
                            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted md:h-8 md:w-8"
                            title={t("assistant.view.backToChat")}
                        >
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        </button>
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-border/80 shadow-sm p-1.5 md:h-8 md:w-8 md:rounded-full">
                            <img src="/bob-ai-mark.png" alt="Bob AI" className="h-full w-full object-contain" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-[750] leading-tight tracking-tight text-foreground md:text-sm md:font-semibold">
                            {panelView === "conversations" ? t("assistant.view.conversations") : panelView === "notifications" ? t("assistant.view.notifications") : "Bob AI"}
                        </h3>
                        <p className="mt-0.5 truncate text-[12px] leading-tight text-muted-foreground md:mt-0 md:text-[11px]">
                            {panelView === "conversations"
                                ? t("assistant.view.chatCount", { count: conversations.length })
                                : panelView === "notifications"
                                    ? t("assistant.view.unreadCount", { count: unreadNotifications })
                                : activeConversationId
                                    ? conversations.find(c => c.id === activeConversationId)?.title || t("assistant.view.chatFallback")
                                    : t("assistant.view.newConversation")
                            }
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {panelView !== "scope" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                            onClick={() => setPanelView("notifications")}
                            title={t("assistant.view.viewNotifications")}
                            aria-label={t("assistant.view.viewNotifications")}
                        >
                            <BellRing className="h-4 w-4 md:h-3.5 md:w-3.5" />
                            {unreadNotifications > 0 && (
                                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white md:-right-1 md:-top-1">
                                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                                </span>
                            )}
                        </Button>
                    )}
                    {panelView === "chat" && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                                onClick={() => setPanelView("conversations")}
                                title={t("assistant.view.viewConversations")}
                            >
                                <MessageSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                                onClick={handleNewChat}
                                title={t("assistant.view.newChat")}
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
                            title={t("assistant.view.newChat")}
                        >
                            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        </Button>
                    )}
                    {panelView !== "notifications" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hidden md:flex"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? t("assistant.view.collapse") : t("assistant.view.expand")}
                        >
                            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-foreground md:h-7 md:w-7"
                        onClick={() => setIsOpen(false)}
                        title={t("assistant.view.close")}
                        aria-label={t("assistant.view.close")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <SideViews
                panelView={panelView} setPanelView={setPanelView} conversations={conversations}
                isLoadingConversations={isLoadingConversations} activeConversationId={activeConversationId}
                loadConversation={loadConversation} archiveConversation={archiveConversation}
                handleNewChat={handleNewChat} notifications={notifications}
                notificationsLoading={notificationsLoading} notificationsError={notificationsError}
                unreadNotifications={unreadNotifications} openNotification={openNotification}
                deleteNotification={deleteNotification} markAllNotificationsRead={markAllNotificationsRead}
                scopeQuestions={scopeQuestions} scopeTrigger={scopeTrigger} scopeSubmitting={scopeSubmitting}
                setScopeSubmitting={setScopeSubmitting} scopeStep={scopeStep} setScopeStep={setScopeStep}
                scopeLoading={scopeLoading} scopeAnswers={scopeAnswers} setScopeAnswers={setScopeAnswers}
                estimateContext={estimateContext} setEstimateContext={setEstimateContext}
                proposalContext={proposalContext} setProposalContext={setProposalContext}
                contextExpanded={contextExpanded} setContextExpanded={setContextExpanded}
                proposalContextExpanded={proposalContextExpanded} setProposalContextExpanded={setProposalContextExpanded}
                estimateContextSummary={estimateContextSummary} isOnQuotePage={isOnQuotePage}
                isOnProposalPage={isOnProposalPage} isOnQuoteProposalPage={isOnQuoteProposalPage}
                pendingProjectSwitch={pendingProjectSwitch} handleSwitchProjectContext={handleSwitchProjectContext}
                handleKeepCurrentProjectContext={handleKeepCurrentProjectContext}
                _fireEstimate={_fireEstimate} _fireProposal={_fireProposal}
            />
            {/* ── Messages (Chat View) ── */}
            {panelView === "chat" && (
                <>
                    <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto px-4 pb-5 pt-4 md:py-3">
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
                                        aria-label={t("assistant.gen.dismiss")}
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
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">{estimateClientPrompt}</p>
                                    {estimateProjectPrompt ? (
                                        <p className="mt-1 text-sm text-slate-600">{estimateProjectPrompt}</p>
                                    ) : null}
                                    <div className="mt-3 flex flex-wrap gap-2">
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
                                            {t("assistant.gen.generateEstimate")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setContextExpanded(true)}
                                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            {t("assistant.gen.editContext")}
                                        </button>
                                    </div>
                                    {!quoteEstimateReady ? (
                                        <p className="mt-2 text-xs leading-5 text-slate-500">
                                            {t("assistant.gen.addDescription")}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {isOnProposalPage &&
                            chatLaunchMode === "proposal" &&
                            messages.length === 0 &&
                            !(generationStatus?.kind === "proposal" && generationStatus.phase !== "failed") && (
                            <div className="rounded-[1.5rem] border border-violet-200 bg-[linear-gradient(135deg,rgba(250,245,255,0.98),rgba(255,255,255,0.98),rgba(245,243,255,0.98))] p-4 shadow-sm">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">{proposalClientPrompt}</p>
                                    {proposalProjectPrompt ? (
                                        <p className="mt-1 text-sm text-slate-600">{proposalProjectPrompt}</p>
                                    ) : null}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleGenerateProposal()}
                                            disabled={isLoading || proposalLoading}
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {proposalLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Zap className="h-4 w-4" />
                                            )}
                                            {t("assistant.gen.generateProposal")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProposalContextExpanded(true)}
                                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            {t("assistant.gen.editContext")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && chatLaunchMode === "general" && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 p-2.5 shadow-md shadow-sky-500/10 border border-border/80 md:h-14 md:w-14">
                                    <img src="/bob-ai-mark.png" alt="Bob AI" className="h-full w-full object-contain" />
                                </div>
                                <h4 className="mb-1.5 text-[20px] font-[760] tracking-tight text-foreground md:text-sm md:font-semibold">
                                    {t("assistant.welcome.title")}
                                </h4>
                                <p className="mb-4 max-w-[280px] text-[14px] leading-5 text-muted-foreground md:mb-3 md:max-w-[260px] md:text-xs">
                                    {t("assistant.welcome.body")}
                                </p>

                                <WelcomeActions
                                    chatLaunchMode={chatLaunchMode} setChatLaunchMode={setChatLaunchMode}
                                    estimateContext={estimateContext} proposalContext={proposalContext}
                                    estimateLoading={estimateLoading} proposalLoading={proposalLoading}
                                    isLoading={isLoading} isOnQuotePage={isOnQuotePage} isOnProposalPage={isOnProposalPage}
                                    handleGenerateEstimate={handleGenerateEstimate} handleQuickAction={handleQuickAction}
                                    setContextExpanded={setContextExpanded} setProposalContextExpanded={setProposalContextExpanded}
                                />

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
                                className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-border/80 p-1 shadow-xs mt-0.5">
                                        <img src="/bob-ai-mark.png" alt="Bob AI" className="h-full w-full object-contain" />
                                    </div>
                                )}
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
                                                    <span className="text-xs">{t("assistant.thinking")}</span>
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

                                            {msg.actionCard && msg.actionCard.options.length > 0 && (
                                                <AgentActionCard
                                                    message={msg}
                                                    executingCommandId={executingCommandId}
                                                    isLoading={isLoading}
                                                    onActionClick={handleActionCardClick}
                                                    onViewProject={(projectId) => {
                                                        setIsOpen(false)
                                                        router.push(`/${locale}/projects/${projectId}`)
                                                    }}
                                                />
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
                    <div className="bg-card px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:py-2.5">
                        <div className="mb-2 flex items-center justify-end gap-1.5">
                            {selectedContext && (
                                <div className="inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                    <span className="truncate">{selectedProjectLabel}</span>
                                    <button
                                        type="button"
                                        onClick={handleDismissSelectedContext}
                                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 transition hover:text-foreground"
                                        aria-label={t("assistant.picker.remove")}
                                        title={t("assistant.picker.remove")}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
                                <PopoverTrigger asChild>
                                    {selectedContext ? (
                                        <button
                                            type="button"
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition hover:border-border hover:text-foreground"
                                            title={t("assistant.picker.switch")}
                                        >
                                            <FolderKanban className="h-3 w-3" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-border hover:text-foreground"
                                        >
                                            <FolderKanban className="h-3 w-3" />
                                            <span>{t("assistant.picker.select")}</span>
                                            <ChevronDown className="h-3 w-3" />
                                        </button>
                                    )}
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-72 p-0">
                                    <Command>
                                        <CommandInput placeholder={t("assistant.picker.search")} className="h-9" />
                                        <CommandList>
                                            {projectsLoading ? (
                                                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    {t("assistant.picker.loading")}
                                                </div>
                                            ) : (
                                                <>
                                                    <CommandEmpty>{t("assistant.picker.none")}</CommandEmpty>
                                                    <CommandGroup heading={t("assistant.picker.projects")}>
                                                        {availableProjects.map((project) => {
                                                            const isSelected = selectedContext?.projectId === project.id
                                                            return (
                                                                <CommandItem
                                                                    key={project.id}
                                                                    value={`${project.title} ${project.id}`}
                                                                    onSelect={() => queueProjectContextSelection({
                                                                        type: "project",
                                                                        projectId: project.id,
                                                                        projectName: project.title,
                                                                        source: "manual",
                                                                    })}
                                                                    className="flex items-center justify-between gap-2"
                                                                >
                                                                    <span className="truncate">{project.title}</span>
                                                                    {isSelected ? <Check className="h-3.5 w-3.5 text-sky-500" /> : null}
                                                                </CommandItem>
                                                            )
                                                        })}
                                                    </CommandGroup>
                                                </>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={selectedContext?.projectName ? t("assistant.input.askAbout", { name: selectedContext.projectName }) : t("assistant.input.askAnything")}
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
