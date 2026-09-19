import React from "react"
import type { Message, ActionCardOption } from "./agent-chat-panel"

export interface AgentActionCardProps {
    message: Message
    executingCommandId: string | number | null
    isLoading?: boolean
    onActionClick: (message: Message, option: ActionCardOption) => void | Promise<void>
}

export function AgentActionCard({
    message,
    executingCommandId,
    isLoading = false,
    onActionClick,
}: AgentActionCardProps) {
    const card = message.actionCard
    if (!card) return null

    const isCardApproved = card.status === "completed" || card.status === "approved"
    const isCardRejected = card.status === "rejected"

    return (
        <div className="mt-3 rounded-2xl border border-sky-200/70 bg-white/80 p-3 text-slate-900 shadow-sm" data-testid="action-card">
            <p className="text-sm font-semibold leading-5" data-testid="action-card-title">
                {card.title}
            </p>
            {card.description ? (
                <p className="mt-1 text-xs leading-5 text-slate-600" data-testid="action-card-description">
                    {card.description}
                </p>
            ) : null}
            {isCardApproved ? (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400" data-testid="action-card-approved">
                    <span>✓ Action Approved</span>
                    {card.replayed && <span className="text-[10px] opacity-75" data-testid="action-card-replayed">(Replayed)</span>}
                </div>
            ) : isCardRejected ? (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-400" data-testid="action-card-cancelled">
                    <span>✕ Action Cancelled</span>
                </div>
            ) : (
                <div className="mt-3 flex flex-wrap gap-2" data-testid="action-card-options">
                    {card.options.map((option) => {
                        const isPrimary = option.style === "primary"
                        const isExecuting = executingCommandId !== null && executingCommandId === card.commandId
                        return (
                            <button
                                key={option.id}
                                type="button"
                                data-testid={`action-card-button-${option.id}`}
                                disabled={isLoading || isExecuting}
                                onClick={() => void onActionClick(message, option)}
                                className={isPrimary
                                    ? "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                    : "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                }
                            >
                                {isExecuting && isPrimary ? "Executing..." : option.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
