import { SubcontractorDetail } from "@/components/subcontractor-detail"

export default async function SubcontractorDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <SubcontractorDetail subcontractorId={id} />
}
