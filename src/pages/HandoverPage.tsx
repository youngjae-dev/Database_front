import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function parseCount(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  const data = asRecord(value)
  if (!data) return null
  const nested = asRecord(data.data) ?? data
  const count = nested?.count ?? nested?.total ?? nested?.value
  return parseCount(count)
}

export default function HandoverPage() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/handover/in-progress/count')
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const raw = (await res.json()) as unknown
      setCount(parseCount(raw))
    } catch (e) {
      setError(e instanceof Error ? e.message : '건수를 불러오지 못했습니다.')
      setCount(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const countLabel =
    count === null ? (loading ? '…' : '—') : count.toLocaleString('ko-KR')

  return (
    <AppShell active="handover">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[900px]">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className={figmaCls.titlePage}>인수인계</h1>
              <p className={`mt-2 max-w-xl ${figmaCls.subtitle}`}>
                진행 중인 인수인계 현황을 확인하고, 필요 시 목록을 새로고침합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className={`h-[48px] min-h-[48px] shrink-0 sm:min-w-[140px] ${figmaCls.btnPrimary} disabled:opacity-50`}
            >
              {loading ? '불러오는 중…' : '새로고침'}
            </button>
          </header>

          {error ? (
            <p className="mb-6 rounded-[12px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
              {error}
            </p>
          ) : null}

          <section
            className={`${figmaCls.panel} p-8`}
            style={{ boxShadow: figma.cardShadow }}
          >
            <h2 className="text-[22px] font-semibold text-black">진행 중 인수인계</h2>
            <p className="mt-2 text-[16px] text-[#555]">
              API <code className="rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[14px]">/handover/in-progress/count</code>{' '}
              기준입니다.
            </p>
            <p className="mt-8 text-center font-['Inter',sans-serif] text-[clamp(2.5rem,8vw,4rem)] font-semibold text-[#081C47]">
              {countLabel}
              <span className="ml-2 text-[24px] font-medium text-black">건</span>
            </p>
          </section>

          <section
            className={`mt-8 ${figmaCls.panel} p-6`}
            style={{ boxShadow: figma.cardShadow }}
          >
            <h2 className="text-[18px] font-semibold text-black">안내</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#374151]">
              <li>인수인계 상세 목록·승인 UI는 백엔드 API가 준비되면 이 페이지에 연결할 수 있습니다.</li>
              <li>대시보드 홈에서도 동일 건수를 요약으로 확인할 수 있습니다.</li>
            </ul>
            <div className="mt-6">
              <Link
                to="/home"
                className="inline-flex items-center text-[15px] font-semibold text-[#174DC0] underline-offset-2 hover:underline"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
