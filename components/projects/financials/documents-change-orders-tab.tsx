'use client'

import { Project } from '@/lib/types'
import { ProjectDocuments } from '../project-documents'
import { ProjectChangeOrders } from '../project-change-orders'

interface DocumentsChangeOrdersTabProps {
  project: Project
}

export function DocumentsChangeOrdersTab({ project }: DocumentsChangeOrdersTabProps) {
  return (
    <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* 1. Documents */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground tracking-tight pb-2 border-b">Project Documents & Receipts</h2>
        <div className="bg-muted rounded-lg p-1 border">
           <ProjectDocuments project={project} />
        </div>
      </div>

      {/* 2. Change Orders Detailed View */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground tracking-tight pb-2 border-b">Change Orders (Contracts & Signatures)</h2>
        <div className="bg-muted rounded-lg p-1 border">
           <ProjectChangeOrders 
              jobId={project.job_id!}
           />
        </div>
      </div>
    </div>
  )
}
