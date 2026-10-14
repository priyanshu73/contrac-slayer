"use client"

import React from "react"
import { useLocale, useTranslations } from "next-intl"
import { BellRing, ChevronDown, ChevronUp, Clock, Loader2, MessageSquare, Plus, Trash2, Zap } from "lucide-react"
import { api } from "@/lib/api"
import type { ScopeClarifiedScope, ScopeQuestion, ScopeQuestionAnswer } from "@/lib/api"
import type { AppNotification } from "@/lib/types/notification"
import type {
    Conversation,
    PanelView,
    PendingProjectContextSwitch,
    ProposalContext,
    QuoteEstimateContext,
} from "@/lib/agent-chat-context"

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export interface SideViewsProps {
    panelView: PanelView
    setPanelView: SetState<PanelView>
    conversations: Conversation[]
    isLoadingConversations: boolean
    activeConversationId: number | null
    loadConversation: (id: number) => void | Promise<void>
    archiveConversation: (id: number) => void | Promise<void>
    handleNewChat: () => void
    notifications: AppNotification[]
    notificationsLoading: boolean
    notificationsError: boolean
    unreadNotifications: number
    openNotification: (n: AppNotification) => void | Promise<void>
    deleteNotification: (n: AppNotification) => void | Promise<void>
    markAllNotificationsRead: () => void | Promise<void>
    scopeQuestions: ScopeQuestion[]
    scopeTrigger: "estimate" | "proposal"
    scopeSubmitting: boolean
    setScopeSubmitting: SetState<boolean>
    scopeStep: number
    setScopeStep: SetState<number>
    scopeLoading: boolean
    scopeAnswers: Record<string, ScopeQuestionAnswer>
    setScopeAnswers: SetState<Record<string, ScopeQuestionAnswer>>
    estimateContext: QuoteEstimateContext
    setEstimateContext: SetState<QuoteEstimateContext>
    proposalContext: ProposalContext
    setProposalContext: SetState<ProposalContext>
    contextExpanded: boolean
    setContextExpanded: SetState<boolean>
    proposalContextExpanded: boolean
    setProposalContextExpanded: SetState<boolean>
    estimateContextSummary: string
    isOnQuotePage: boolean
    isOnProposalPage: boolean
    isOnQuoteProposalPage: boolean
    pendingProjectSwitch: PendingProjectContextSwitch | null
    handleSwitchProjectContext: () => void
    handleKeepCurrentProjectContext: () => void
    _fireEstimate: (scope: ScopeClarifiedScope | null) => void
    _fireProposal: (scope: ScopeClarifiedScope | null) => void
}

export function SideViews(props: SideViewsProps) {
    const t = useTranslations("dashboard")
    const locale = useLocale()
    const {
        panelView, setPanelView, conversations, isLoadingConversations, activeConversationId,
        loadConversation, archiveConversation, handleNewChat, notifications, notificationsLoading,
        notificationsError, unreadNotifications, openNotification, deleteNotification,
        markAllNotificationsRead, scopeQuestions, scopeTrigger, scopeSubmitting, setScopeSubmitting,
        scopeStep, setScopeStep, scopeLoading, scopeAnswers, setScopeAnswers, estimateContext,
        setEstimateContext, proposalContext, setProposalContext, contextExpanded, setContextExpanded,
        proposalContextExpanded, setProposalContextExpanded, estimateContextSummary, isOnQuotePage,
        isOnProposalPage, isOnQuoteProposalPage, pendingProjectSwitch, handleSwitchProjectContext,
        handleKeepCurrentProjectContext, _fireEstimate, _fireProposal,
    } = props

    function formatTimeAgo(dateStr: string): string {
        const date = new Date(dateStr)
        const diffMs = Date.now() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return t("assistant.time.justNow")
        if (diffMins < 60) return t("assistant.time.minutes", { count: diffMins })
        if (diffHours < 24) return t("assistant.time.hours", { count: diffHours })
        if (diffDays < 7) return t("assistant.time.days", { count: diffDays })
        return date.toLocaleDateString(locale === "es" ? "es-US" : "en-US")
    }

    return (
        <>
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
                            <p className="mb-3 text-[15px] font-medium text-muted-foreground md:text-sm">{t("assistant.convList.empty")}</p>
                            <button
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600
                                       min-h-11 px-4 py-2 text-sm font-semibold text-white shadow-sm md:min-h-0 md:text-xs md:font-medium
                                       hover:shadow-md transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {t("assistant.convList.startNew")}
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
                                        title={t("assistant.convList.delete")}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {panelView === "notifications" && (
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                        <p className="text-xs text-muted-foreground">{t("assistant.notif.updates")}</p>
                        {unreadNotifications > 0 && (
                            <button type="button" onClick={markAllNotificationsRead} className="text-xs font-semibold text-sky-700 hover:underline">
                                {t("assistant.notif.markAllRead")}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {notificationsLoading && notifications.length === 0 ? (
                            <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : notificationsError ? (
                            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                                <BellRing className="mb-3 h-6 w-6 text-muted-foreground" />
                                <p className="text-sm font-semibold text-foreground">{t("assistant.notif.unavailable")}</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("assistant.notif.unavailableDesc")}</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><BellRing className="h-5 w-5" /></div>
                                <p className="text-sm font-semibold text-foreground">{t("assistant.notif.empty")}</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("assistant.notif.emptyDesc")}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex w-full items-start gap-2 px-4 py-3 transition hover:bg-muted/60 ${notification.read_at ? "bg-card" : "bg-sky-50/60"}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openNotification(notification)}
                                            className="flex min-w-0 flex-1 gap-3 text-left"
                                        >
                                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-slate-300" : "bg-sky-500"}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-foreground">{notification.title}</span>
                                                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{notification.body}</span>
                                                <span className="mt-1 block text-[11px] text-muted-foreground/80">{formatTimeAgo(notification.created_at)}</span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteNotification(notification)}
                                            className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                                            title={t("assistant.notif.delete")}
                                            aria-label={t("assistant.notif.deleteNamed", { title: notification.title })}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                                <p className="text-sm font-semibold text-foreground">{t("assistant.scope.title")}</p>
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
                                    <span className="text-sm">{t("assistant.scope.analyzing")}</span>
                                </div>
                            )}
                            {!scopeLoading && q && (
                                <div className="space-y-3">
                                    <p className="text-sm font-medium leading-snug text-foreground">
                                        {q.text}
                                        {q.type === "multi_select" && (
                                            <span className="text-muted-foreground font-normal"> {t("assistant.scope.selectAll")}</span>
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
                                                    {t("assistant.scope.somethingElse")}
                                                </p>
                                                <textarea
                                                    placeholder={t("assistant.scope.addMore")}
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
                                            placeholder={t("assistant.scope.typeAnswer")}
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
                                        {t("assistant.scope.back")}
                                    </button>
                                ) : (
                                    <button
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                                        disabled={scopeSubmitting}
                                        onClick={fireSkipAll}
                                    >
                                        {t("assistant.scope.skipAll")}
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
                                        {t("assistant.scope.skip")}
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
                                    {isLast ? t("assistant.scope.submit") : t("assistant.scope.next")}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ── Quote Estimate Context (shown on quote pages) ── */}
            {panelView === "chat" && isOnQuotePage && (() => {
                const isStandaloneQuote = !estimateContext.projectId
                return (
                <div className="border-b border-border bg-muted/30">
                    <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                        onClick={() => setContextExpanded((v) => !v)}
                    >
                        <div className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-sky-500" />
                            <span className="text-xs font-semibold text-foreground">{isStandaloneQuote ? t("assistant.context.estimateContext") : t("assistant.context.projectContext")}</span>
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
                                    {isStandaloneQuote ? t("assistant.context.estimateType") : t("assistant.context.projectType")}
                                </label>
                                <input
                                    type="text"
                                    value={estimateContext.projectType}
                                    onChange={(e) => setEstimateContext((prev) => ({ ...prev, projectType: e.target.value }))}
                                    placeholder={t("assistant.context.typePlaceholder")}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    {isStandaloneQuote ? t("assistant.context.estimateDescription") : t("assistant.context.projectDescription")}
                                </label>
                                <textarea
                                    value={estimateContext.serviceDescription}
                                    onChange={(e) => setEstimateContext((prev) => ({ ...prev, serviceDescription: e.target.value }))}
                                    placeholder={t("assistant.context.descPlaceholder")}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                />
                            </div>
                            {!isStandaloneQuote && (
                                <>
                                    <label className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            checked={estimateContext.includeProjectBriefInContext ?? true}
                                            onChange={(e) => setEstimateContext((prev) => ({ ...prev, includeProjectBriefInContext: e.target.checked }))}
                                            className="h-3.5 w-3.5 rounded border-gray-300 accent-sky-600"
                                        />
                                        {t("assistant.context.includeBrief")}
                                    </label>
                                    {!estimateContext.projectBrief && (
                                        <p className="text-[11px] text-muted-foreground/80">
                                            {t("assistant.context.noBrief")}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
                )
            })()}

            {/* ── Proposal Context (shown on proposal builder pages) ── */}
            {panelView === "chat" && isOnProposalPage && (
                <div className="border-b border-border bg-muted/30">
                    <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
                        onClick={() => setProposalContextExpanded((v) => !v)}
                    >
                        <div className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-violet-500" />
                            <span className="text-xs font-semibold text-foreground">{t("assistant.context.proposalContext")}</span>
                            {(proposalContext.proposalTitle || proposalContext.projectTitle || proposalContext.description) && (
                                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                                    {t("assistant.context.filled")}
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
                                    {t("assistant.context.proposalTitle")}
                                </label>
                                <input
                                    type="text"
                                    value={proposalContext.proposalTitle}
                                    onChange={(e) => setProposalContext((prev) => ({ ...prev, proposalTitle: e.target.value }))}
                                    placeholder={t("assistant.context.proposalTitlePlaceholder")}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                />
                            </div>
                            {!isOnQuoteProposalPage && (
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                        {t("assistant.context.project")}
                                    </label>
                                    <input
                                        type="text"
                                        value={proposalContext.projectTitle}
                                        onChange={(e) => setProposalContext((prev) => ({ ...prev, projectTitle: e.target.value }))}
                                        placeholder={t("assistant.context.projectNamePlaceholder")}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    {t("assistant.context.description")}
                                </label>
                                <textarea
                                    value={proposalContext.description}
                                    onChange={(e) => setProposalContext((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder={t("assistant.context.proposalDescPlaceholder")}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                />
                            </div>
                            {(proposalContext.lineItems?.length ?? 0) > 0 && (
                                <label className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={proposalContext.includeLineItemsInContext ?? true}
                                        onChange={(e) => setProposalContext((prev) => ({ ...prev, includeLineItemsInContext: e.target.checked }))}
                                        className="h-3.5 w-3.5 rounded border-gray-300 accent-violet-600"
                                    />
                                    {t("assistant.context.includeLineItems")}
                                </label>
                            )}
                            {proposalContext.projectBrief && (
                                <label className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={proposalContext.includeProjectBriefInContext ?? true}
                                        onChange={(e) => setProposalContext((prev) => ({ ...prev, includeProjectBriefInContext: e.target.checked }))}
                                        className="h-3.5 w-3.5 rounded border-gray-300 accent-violet-600"
                                    />
                                    {t("assistant.context.includeBrief")}
                                </label>
                            )}
                        </div>
                    )}
                </div>
            )}

            {panelView === "chat" && pendingProjectSwitch && (
                <div className="border-b border-border bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))] px-4 py-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3 shadow-sm">
                            <p className="text-sm font-semibold text-amber-950">
                                {t("assistant.switch.title")}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-900/80">
                                {t.rich(pendingProjectSwitch.source === "auto" ? "assistant.switch.auto" : "assistant.switch.manual", {
                                    name: pendingProjectSwitch.projectName,
                                    b: (chunks) => <span className="font-semibold">{chunks}</span>,
                                })}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleSwitchProjectContext}
                                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
                                >
                                    {t("assistant.switch.confirm")}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleKeepCurrentProjectContext}
                                    className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-3.5 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-50"
                                >
                                    {t("assistant.switch.keep")}
                                </button>
                            </div>
                    </div>
                </div>
            )}

        </>
    )
}
