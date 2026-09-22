export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  entity_type: string | null
  entity_id: number | null
  action_url: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface NotificationListResponse {
  items: AppNotification[]
  unread_count: number
  total: number
}
