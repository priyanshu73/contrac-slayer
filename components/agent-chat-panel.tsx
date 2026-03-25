"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import {
    Bot, X, Send, Loader2, Sparkles, Plus,
    MessageSquare, ChevronLeft, Trash2, Clock,
    Sun, BellRing, Maximize2, Minimize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

// ─── Route → Page Context mapping ──────────────────────────────

interface PageContext {
    page: string
    entity_id?: string
}

const DETAIL_ROUTES: { pattern: RegExp; page: string }[] = [
    { pattern: /\/contacts\/sub\/([^/]+)/, page: "subcontractor_detail" },
    { pattern: /\/contacts\/([^/]+)/, page: "client_detail" },
    { pattern: /\/leads\/([^/]+)/, page: "lead_detail" },
    { pattern: /\/projects\/([^/]+)/, page: "project_detail" },
    { pattern: /\/quotes\/([^/]+)/, page: "quote_detail" },
    { pattern: /\/calendar\/([^/]+)/, page: "booking_detail" },
    { pattern: /\/invoices\/([^/]+)/, page: "invoice_detail" },
]

const LIST_ROUTES: { pattern: RegExp; page: string }[] = [
    { pattern: /\/dashboard/, page: "dashboard" },
    { pattern: /\/contacts/, page: "contacts" },
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
    default: [
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
type PanelView = "chat" | "conversations"

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

    // Parse page context from current route
    const pageContext = useMemo(() => parsePageContext(pathname ?? ""), [pathname])
    const suggestions = SUGGESTIONS[pageContext.page] || SUGGESTIONS.default

    // Entity color mapping
    const getEntityColorClass = useCallback((toolNameOrPath: string): string => {
        if (!toolNameOrPath) return ""
        const lowered = toolNameOrPath.toLowerCase()
        if (lowered.includes("subcontractor") || lowered.includes("/sub/")) return "text-orange-500"
        if (lowered.includes("client") || (lowered.includes("/contacts/") && !lowered.includes("/sub/"))) return "text-violet-500"
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

    // ─── Chat handlers ──────────────────────────────────────────

    const handleNewChat = useCallback(() => {
        setActiveConversationId(null)
        setMessages([])
        setPanelView("chat")
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

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
                    page_context: pageContext.page !== "unknown" ? pageContext : undefined,
                    conversation_id: activeConversationId || undefined,
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
    }, [pageContext, activeConversationId, fetchConversations])

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
                    page_context: pageContext.page !== "unknown" ? pageContext : undefined,
                    conversation_id: activeConversationId || undefined,
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
                className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50
                   flex items-center gap-2 rounded-full
                   bg-gradient-to-r from-sky-500 to-blue-600
                   px-4 py-3 text-white shadow-lg shadow-sky-500/25
                   transition-all duration-300
                   hover:shadow-xl hover:shadow-sky-500/30 hover:scale-105
                   active:scale-95"
                title="Open AI Assistant"
            >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold hidden sm:inline">AI Assistant</span>
            </button>
        )
    }

    // ─── Chat Panel ─────────────────────────────────────────────
    return (
        <div
            id="agent-chat-panel"
            className={`fixed bottom-0 right-0 md:bottom-4 md:right-4 z-50
                 flex flex-col
                 w-full h-[85vh] md:max-h-[90vh]
                 rounded-t-2xl md:rounded-2xl
                 border border-border bg-card
                 shadow-2xl shadow-black/10
                 overflow-hidden transition-all duration-300
                 ${isExpanded 
                     ? "md:w-[800px] md:h-[800px] md:max-w-[70vw]" 
                     : "md:w-[420px] md:h-[600px] md:max-h-[80vh]"
                 }`}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-sky-500/10 to-blue-500/5">
                <div className="flex items-center gap-2.5">
                    {panelView === "conversations" ? (
                        <button
                            onClick={() => setPanelView("chat")}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
                            title="Back to chat"
                        >
                            <ChevronLeft className="h-4 w-4 text-foreground" />
                        </button>
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                            {panelView === "conversations" ? "Conversations" : "AI Assistant"}
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-tight">
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
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setPanelView("conversations")}
                                title="View conversations"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={handleNewChat}
                                title="New chat"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                    {panelView === "conversations" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={handleNewChat}
                            title="New chat"
                        >
                            <Plus className="h-3.5 w-3.5" />
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
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">No conversations yet</p>
                            <button
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600
                                       px-4 py-2 text-xs font-medium text-white shadow-sm
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
                                    className={`group flex items-center gap-3 px-4 py-3
                                        cursor-pointer transition-colors
                                        hover:bg-muted/60
                                        ${activeConversationId === conv.id
                                            ? "bg-sky-500/8 border-l-2 border-sky-500"
                                            : "border-l-2 border-transparent"
                                        }`}
                                    onClick={() => loadConversation(conv.id)}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {conv.title}
                                        </p>
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
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

            {/* ── Messages (Chat View) ── */}
            {panelView === "chat" && (
                <>
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 mb-4">
                                    <Sparkles className="h-7 w-7 text-sky-600" />
                                </div>
                                <h4 className="text-sm font-semibold text-foreground mb-1.5">
                                    How can I help?
                                </h4>
                                <p className="text-xs text-muted-foreground mb-3 max-w-[260px]">
                                    I can look up your leads, clients, quotes, projects, calendar, and more.
                                </p>

                                {/* ── Quick Action Buttons ── */}
                                <div className="flex gap-2 mb-4 w-full max-w-[300px]">
                                    <button
                                        onClick={() => handleQuickAction("Good morning! Give me my daily briefing.")}
                                        disabled={isLoading}
                                        className="flex-1 flex items-center justify-center gap-1.5
                                            rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10
                                            px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400
                                            transition-all hover:shadow-md hover:shadow-amber-500/10 hover:border-amber-500/40
                                            hover:scale-[1.02] active:scale-[0.98]
                                            disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <Sun className="h-3.5 w-3.5" />
                                        Morning Briefing
                                    </button>
                                    <button
                                        onClick={() => handleQuickAction("What should I follow up on today?")}
                                        disabled={isLoading}
                                        className="flex-1 flex items-center justify-center gap-1.5
                                            rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/10
                                            px-3 py-2.5 text-xs font-medium text-sky-700 dark:text-sky-400
                                            transition-all hover:shadow-md hover:shadow-sky-500/10 hover:border-sky-500/40
                                            hover:scale-[1.02] active:scale-[0.98]
                                            disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <BellRing className="h-3.5 w-3.5" />
                                        Follow-Ups
                                    </button>
                                </div>

                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setInput(suggestion)
                                                setTimeout(() => inputRef.current?.focus(), 50)
                                            }}
                                            className="rounded-full border border-border px-3 py-1.5
                                     text-xs text-muted-foreground
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
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user"
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
                                                                    || internalPath?.startsWith("/contacts/")
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
                    <div className="border-t border-border bg-card px-3 py-2.5">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything..."
                                rows={1}
                                className="flex-1 resize-none rounded-xl border border-border bg-muted/50
                               px-3.5 py-2.5 text-sm placeholder:text-muted-foreground
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
                                className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600
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
