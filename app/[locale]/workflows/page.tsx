import { notFound } from "next/navigation"
import { WorkflowInboxPage } from "@/components/workflows/workflow-inbox-page"

export default function WorkflowsPage() {
  if (process.env.NEXT_PUBLIC_WORKFLOWS_ENABLED !== "true") {
    notFound()
  }
  return <WorkflowInboxPage />
}

