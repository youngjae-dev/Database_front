/**
 * 백엔드 호출용 베이스 URL.
 * - 개발: 비우면 상대 경로 `/api/...` → Vite 프록시가 `VITE_PROXY_TARGET`(기본 8080)으로 넘김
 * - 프로덕션: API가 다른 도메인이면 `VITE_API_ORIGIN` 설정 (예: https://api.example.com)
 */
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(
  /\/$/,
  '',
) ?? ''
const API_PREFIX =
  (import.meta.env.VITE_API_PREFIX as string | undefined)?.replace(/\/$/, '') ||
  '/api'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_ORIGIN}${API_PREFIX}${p}`
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (
    init?.body &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include',
  })
}

/** 응답 본문 문자열에서 에러 메시지 추출 (이미 `text()`로 읽은 뒤에 사용) */
export function parseApiErrorBody(text: string, statusText?: string): string {
  const t = text.trim()
  if (!t) return statusText || '요청에 실패했습니다.'
  try {
    const data = JSON.parse(t) as { message?: string; error?: string }
    return data.message || data.error || t
  } catch {
    return t
  }
}

/** Response 본문을 읽어 에러 메시지 추출 */
export async function readApiErrorMessage(res: Response): Promise<string> {
  return parseApiErrorBody(await res.text(), res.statusText)
}
