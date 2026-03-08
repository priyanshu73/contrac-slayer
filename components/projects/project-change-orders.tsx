"use client"

import { useEffect, useState } from "react"
import type { Job } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"

interface ProjectChangeOrdersProps {
  jobId?: number
}

export function ProjectChangeOrders({ jobId }: ProjectChangeOrdersProps) {
  const t = useTranslations("projects.changeOrders")
  const [changeOrders, setChangeOrders] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const orders = await api.getChangeOrders(jobId)
        if (!cancelled) setChangeOrders(Array.isArray(orders) ? orders : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [jobId])

  if (!jobId) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("noRootJob")}
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("loading")}
      </Card>
    )
  }

  if (!changeOrders.length) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("empty")}
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {t("title")}
        </h3>
        <Badge variant="outline" className="text-[11px]">
          {changeOrders.length}
        </Badge>
      </div>
      <div className="divide-y divide-slate-100">
        {changeOrders.map((order) => (
          <div key={order.id} className="py-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {order.title || t("changeOrderLabel", { id: order.id })}
              </p>
              {order.job_description && (
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                  {order.job_description}
                </p>
              )}
            </div>
            {order.status && (
              <Badge variant="outline" className="text-[11px]">
                {order.status}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

