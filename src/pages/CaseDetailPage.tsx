import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'

type CaseRow = {
  id: number
  caseName: string
  description?: string | null
  status?: string
  createdAt?: string
}

function statusLabel(status: string | undefined): string {
  if (status === 'OPEN') return '진행 중'
  if (status === 'CLOSED') return '종결됨'
  return status ?? '—'
}

function formatDate(value: string | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d)
}

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const [row, setRow] = useState<CaseRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const idNum = useMemo(() => Number(caseId), [caseId])

  useEffect(() => {
    if (!caseId || !Number.isFinite(idNum)) {
      setLoading(false)
      setError('잘못된 사건 ID입니다.')
      return
    }
    let ignore = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch('/cases')
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const list = (await res.json()) as CaseRow[]
        const found = Array.isArray(list)
          ? list.find((c) => c.id === idNum) ?? null
          : null
        if (!ignore) {
          setRow(found)
          if (!found) setError('해당 사건을 찾을 수 없습니다.')
        }
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : '불러오기에 실패했습니다.')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [caseId, idNum])

  return (
    <AppShell active="cases">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1000px]">
        <nav className="mb-8 flex flex-wrap gap-3 text-[14px] text-[#174DC0]">
          <Link to="/home" className="hover:underline">
            홈
          </Link>
          <span className="text-[#d9d9d9]">|</span>
          <Link to="/CaseList" className="hover:underline">
            사건 목록
          </Link>
          <span className="text-[#d9d9d9]">|</span>
          <Link to={`/EvidenceRegister?caseId=${caseId ?? ''}`} className="hover:underline">
            이 사건에 증거물 등록
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className={figmaCls.titlePage}>사건 정보</h1>
          <p className={`mt-2 ${figmaCls.subtitle}`}>선택한 사건의 기본 정보와 개요를 확인합니다.</p>
        </header>

        {loading ? (
          <p className="text-[16px] text-[#666]">불러오는 중…</p>
        ) : error ? (
          <p className="rounded-[10px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
            {error}
          </p>
        ) : row ? (
          <>
            <section className={`mb-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <h2 className="text-[22px] font-semibold text-black">기본정보</h2>
              <div className="mt-6 grid gap-0 overflow-hidden rounded-[10px] border border-[#d9d9d9] md:grid-cols-2">
                {[
                  ['사건 ID', String(row.id)],
                  ['사건명', row.caseName],
                  ['사건 상태', statusLabel(row.status)],
                  ['등록일시', formatDate(row.createdAt)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex border-b border-[#d9d9d9] md:border-r md:last:border-r-0 [&:nth-child(2n)]:md:border-r-0"
                  >
                    <div className="w-[140px] shrink-0 bg-[rgba(167,193,255,0.29)] px-4 py-4 text-[16px] font-medium text-[#081c47]">
                      {k}
                    </div>
                    <div className="flex flex-1 items-center px-4 py-4 text-[16px] text-[#081c47]">
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`mb-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <h2 className="text-[22px] font-semibold text-black">사건 개요 및 설명</h2>
              <div className="mt-4 min-h-[120px] whitespace-pre-wrap rounded-[10px] border border-[#d9d9d9] bg-[#fafafa] p-4 text-[17px] leading-relaxed text-black">
                {row.description?.trim() ? row.description : '등록된 설명이 없습니다.'}
              </div>
            </section>

            <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <h2 className="text-[22px] font-semibold text-black">처리 이력</h2>
              <p className="mt-2 text-[16px] text-[#555]">
                처리 일시·유형·담당자 이력 API가 연결되면 이 영역에 표시할 수 있습니다.
              </p>
              <div className="mt-4 overflow-hidden rounded-[10px] border border-[#d9d9d9]">
                <div className="grid grid-cols-3 bg-[rgba(167,193,255,0.29)] text-center text-[15px] font-medium text-[#081c47]">
                  <div className="border-r border-[#d9d9d9] py-3">처리일시</div>
                  <div className="border-r border-[#d9d9d9] py-3">처리 유형</div>
                  <div className="py-3">담당자</div>
                </div>
                <div className="py-8 text-center text-[15px] text-[#888]">표시할 이력이 없습니다.</div>
              </div>
            </section>
          </>
        ) : null}
        </div>
      </div>
    </AppShell>
  )
}
