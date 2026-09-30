import type { ContractorTask } from "@/lib/types"

type TaskAssignee = Pick<ContractorTask, "assigned_to" | "subcontractor_id">

export function taskMatchesAssigneeFilter(task: TaskAssignee, assigneeFilter: string) {
  if (assigneeFilter === "ALL") return true

  if (assigneeFilter.startsWith("crew:")) {
    return task.subcontractor_id != null && `crew:${task.subcontractor_id}` === assigneeFilter
  }

  return (task.assigned_to?.trim() || "") === assigneeFilter
}
