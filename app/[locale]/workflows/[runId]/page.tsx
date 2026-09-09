import { WorkflowReviewPage } from "@/components/workflows/workflow-review-page"

export default async function WorkflowRunPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  return <WorkflowReviewPage runId={runId} />
}
