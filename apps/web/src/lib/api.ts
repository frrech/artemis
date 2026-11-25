export type ApiError = Error & { status?: number }

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBase}${path}`, { ...options, headers })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    let message = `A solicitação falhou (HTTP ${response.status}).`
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      if (typeof payload.message === 'string') {
        message = payload.message
      } else if (Array.isArray(payload.message)) {
        const details = payload.message.filter(
          (item): item is string => typeof item === 'string',
        )
        if (details.length > 0) message = details.join(' ')
      }
    }
    const error = new Error(message) as ApiError
    error.status = response.status
    throw error
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
