/** Contractor-owned tasks that are not attached to a project. */

const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api')
  .trim().replace(/^['"]+|['"]+$/g, '').replace(/\/+$/, '')

function apiBaseUrl(): string {
  if (typeof window === 'undefined' || configuredApiUrl.startsWith('/')) return configuredApiUrl
  try {
    const parsed = new URL(configuredApiUrl)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      parsed.hostname = window.location.hostname
      return parsed.toString().replace(/\/+$/, '')
    }
  } catch { /* Keep the configured URL. */ }
  return configuredApiUrl
}

async function requestProjectlessTask<T>(path: string, method: string, payload?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  if (!response.ok) {
    let detail: unknown
    try { detail = (await response.json()).detail } catch { /* Use generic error. */ }
    const message = typeof detail === 'string' && !/sqlalchemy|psycopg|traceback|stacktrace|\[SQL:/i.test(detail)
      ? detail : 'Something went wrong. Please try again.'
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const projectlessTasks = {
  create: <T>(payload: unknown) => requestProjectlessTask<T>('/project-tasks', 'POST', payload),
  update: <T>(taskId: number, payload: unknown) => requestProjectlessTask<T>(`/project-tasks/${taskId}`, 'PATCH', payload),
  delete: (taskId: number) => requestProjectlessTask<void>(`/project-tasks/${taskId}`, 'DELETE'),
}
