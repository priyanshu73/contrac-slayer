"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Bot, X, Send, Loader2, Sparkles, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

export function AgentChatPanel() {
    const router = useRouter()
    const locale = useLocale()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

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
                body: JSON.stringify({ messages: history }),
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

    const handleReset = () => {
        setMessages([])
        setInput("")
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
            className="fixed bottom-0 right-0 md:bottom-4 md:right-4 z-50
                 flex flex-col
                 w-full md:w-[420px] h-[85vh] md:h-[600px] md:max-h-[80vh]
                 rounded-t-2xl md:rounded-2xl
                 border border-border bg-card
                 shadow-2xl shadow-black/10
                 overflow-hidden"
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-sky-500/10 to-blue-500/5">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                            AI Assistant
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                            Ask about your business
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={handleReset}
                        title="New conversation"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
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

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 mb-4">
                            <Sparkles className="h-7 w-7 text-sky-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground mb-1.5">
                            How can I help?
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4 max-w-[260px]">
                            I can look up your leads, clients, quotes, projects, calendar, and more.
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {[
                                "How many leads do I have?",
                                "Show my active projects",
                                "What's on my calendar?",
                                "Dashboard summary",
                            ].map((suggestion) => (
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
                            {msg.role === "assistant" && !msg.content && isLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span className="text-xs">Thinking...</span>
                                </div>
                            ) : (
                                <div className="break-words">
                                    <ReactMarkdown
                                        components={{
                                            ul: ({ ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                                            ol: ({ ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                                            li: ({ ...props }) => <li className="mb-1" {...props} />,
                                            p: ({ ...props }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                                            a: ({ href, children, ...props }) => {
                                                // Extract internal app path from href
                                                // Handles: "/quotes/123", "https://yourdomain.com/quotes/123", etc.
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

                                                if (isAppRoute && internalPath) {
                                                    const localePath = `/${locale}${internalPath}`
                                                    return (
                                                        <a
                                                            href={localePath}
                                                            className="underline text-sky-500 hover:text-sky-400 transition-colors cursor-pointer"
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
                                                        className="underline hover:opacity-80 transition-opacity"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        href={href}
                                                        {...props}
                                                    >
                                                        {children}
                                                    </a>
                                                )
                                            },
                                            strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
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
        </div>
    )
}
