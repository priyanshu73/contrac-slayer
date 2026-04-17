import { CampaignDetailPage } from "@/components/lead-generator-agent/campaign-detail-page"

export default async function LeadGeneratorCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params

  return <CampaignDetailPage campaignId={campaignId} />
}
