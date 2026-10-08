"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { BellRing, Loader2, Sun, Zap } from "lucide-react"
import type { ChatLaunchMode, ProposalContext, QuoteEstimateContext } from "@/lib/agent-chat-context"

export interface WelcomeActionsProps {
    chatLaunchMode: ChatLaunchMode
    setChatLaunchMode: (mode: ChatLaunchMode) => void
    estimateContext: QuoteEstimateContext
    proposalContext: ProposalContext
    estimateLoading: boolean
    proposalLoading: boolean
    isLoading: boolean
    isOnQuotePage: boolean
    isOnProposalPage: boolean
    handleGenerateEstimate: () => void
    handleQuickAction: (message: string) => void
    setContextExpanded: (expanded: boolean) => void
    setProposalContextExpanded: (expanded: boolean) => void
}

export function WelcomeActions({
    chatLaunchMode, setChatLaunchMode, estimateContext, proposalContext, estimateLoading,
    proposalLoading, isLoading, isOnQuotePage, isOnProposalPage, handleGenerateEstimate,
    handleQuickAction, setContextExpanded, setProposalContextExpanded,
}: WelcomeActionsProps) {
    const t = useTranslations("dashboard")
    return (
        <>
                                {/* ── Quick Action Buttons ── */}
                                {isOnQuotePage && chatLaunchMode === "general" ? (
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
                                            {t("assistant.gen.aiEstimate")}
                                        </button>
                                    </div>
                                ) : isOnProposalPage ? (
                                    <div className="mb-4 w-full max-w-[330px] md:max-w-[300px]">
                                        <button
                                            onClick={() => {
                                                const hasContext = proposalContext.proposalTitle?.trim() || proposalContext.description?.trim()
                                                setChatLaunchMode("proposal")
                                                if (!hasContext) setProposalContextExpanded(true)
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
                                            {t("assistant.gen.aiProposal")}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-4 flex w-full max-w-[330px] gap-2 md:max-w-[300px]">
                                        <button
                                            onClick={() => handleQuickAction(t("assistant.welcome.briefingPrompt"))}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5
                                                rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10
                                                min-h-12 px-3 py-2.5 text-[13px] font-semibold text-amber-700 dark:text-amber-400 md:min-h-0 md:text-xs md:font-medium
                                                transition-all hover:shadow-md hover:shadow-amber-500/10 hover:border-amber-500/40
                                                hover:scale-[1.02] active:scale-[0.98]
                                                disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            <Sun className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                            {t("assistant.welcome.briefing")}
                                        </button>
                                        <button
                                            onClick={() => handleQuickAction(t("assistant.welcome.followUpsPrompt"))}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5
                                                rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/10
                                                min-h-12 px-3 py-2.5 text-[13px] font-semibold text-sky-700 dark:text-sky-400 md:min-h-0 md:text-xs md:font-medium
                                                transition-all hover:shadow-md hover:shadow-sky-500/10 hover:border-sky-500/40
                                                hover:scale-[1.02] active:scale-[0.98]
                                                disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            <BellRing className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                            {t("assistant.welcome.followUps")}
                                        </button>
                                    </div>
                                )}
        </>
    )
}
