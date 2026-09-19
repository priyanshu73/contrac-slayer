import React, { useEffect, useRef, useState } from "react"
import type { Message, ActionCardOption } from "./agent-chat-panel"

export interface AgentActionCardProps {
    message: Message
    executingCommandId: string | number | null
    isLoading?: boolean
    onActionClick: (message: Message, option: ActionCardOption) => void | Promise<void>
    onViewProject?: (projectId: string) => void
}

/**
 * Command results wrap their domain entity differently across the legacy and
 * AG-UI paths. Find a project ID structurally so a completed project command
 * can always expose a useful next action without parsing Bob's prose.
 */
function findProjectId(value: unknown, projectScope = false, depth = 0): string | null {
    if (!value || typeof value !== "object" || depth > 4) return null
    if (Array.isArray(value)) {
        for (const item of value) {
            const id = findProjectId(item, projectScope, depth + 1)
            if (id) return id
        }
        return null
    }

    const record = value as Record<string, unknown>
    const projectId = record.project_id ?? record.projectId
    if (typeof projectId === "number" || (typeof projectId === "string" && projectId.trim())) {
        return String(projectId)
    }

    const type = String(record.type ?? record.entity_type ?? record.entityType ?? "").toLowerCase()
    const action = String(record.action ?? "").toLowerCase()
    const isProject = projectScope || type === "project" || action === "create_project" || action === "update_project"
    if (isProject && (typeof record.id === "number" || (typeof record.id === "string" && record.id.trim()))) {
        return String(record.id)
    }

    for (const key of ["entity", "result", "preview", "data"]) {
        const id = findProjectId(record[key], isProject, depth + 1)
        if (id) return id
    }
    return null
}

export function AgentActionCard({
    message,
    executingCommandId,
    isLoading = false,
    onActionClick,
    onViewProject,
}: AgentActionCardProps) {
    const card = message.actionCard
    if (!card) return null

    const status = card.status?.toLowerCase()
    const isCardApproved = status === "completed" || status === "approved"
    const isCardRejected = status === "rejected"
    const isProjectApproval = card.action === "create_project" && !isCardApproved && !isCardRejected
    const suggestedTitle = typeof card.entity?.title === "string" ? card.entity.title : ""
    const [projectTitle, setProjectTitle] = useState(
        typeof card.editedPayload?.title === "string" ? card.editedPayload.title : suggestedTitle,
    )
    const projectTitleRef = useRef(projectTitle)

    useEffect(() => {
        if (!isProjectApproval) return
        const nextTitle = typeof card.editedPayload?.title === "string" ? card.editedPayload.title : suggestedTitle
        projectTitleRef.current = nextTitle
        setProjectTitle(nextTitle)
    }, [card.commandId, card.editedPayload?.title, isProjectApproval, suggestedTitle])
    const projectId = isCardApproved
        ? findProjectId(card.result) || findProjectId(card.entity, card.action === "create_project")
        : null

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
            {isProjectApproval ? (
                <label className="mt-3 block text-xs font-medium text-slate-700">
                    Project name
                    <input
                        data-testid="action-card-project-title"
                        value={projectTitle}
                        onInput={(event) => {
                            projectTitleRef.current = event.currentTarget.value
                            setProjectTitle(event.currentTarget.value)
                        }}
                        placeholder="Project name"
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                </label>
            ) : null}
            {isCardApproved ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400" data-testid="action-card-approved">
                        <span>✓ Action Approved</span>
                        {card.replayed && <span className="text-[10px] opacity-75" data-testid="action-card-replayed">(Replayed)</span>}
                    </div>
                    {projectId && onViewProject ? (
                        <button
                            type="button"
                            data-testid="action-card-view-project"
                            onClick={() => onViewProject(projectId)}
                            className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                            View Project
                        </button>
                    ) : null}
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
                                disabled={isLoading || isExecuting || (isProjectApproval && isPrimary && !projectTitle.trim())}
                                onClick={() => void onActionClick(
                                    isProjectApproval
                                        ? {
                                            ...message,
                                            actionCard: {
                                                ...card,
                                                editedPayload: { title: projectTitleRef.current.trim() },
                                            },
                                        }
                                        : message,
                                    option,
                                )}
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
