import { notFound } from "next/navigation"
import { WorkflowReviewPage } from "@/components/workflows/workflow-review-page"

export default async function WorkflowRunPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  if (process.env.NEXT_PUBLIC_WORKFLOWS_ENABLED !== "true") {
    notFound()
  }
  const { runId } = await params
  return <WorkflowReviewPage runId={runId} />
}

