import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

const PAGE_SIZE = 8

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

function dayStart(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayEnd(t: number): number {
  const d = new Date(t)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export default function CaseListPage() {
  const [rows, setRows] = useState<CaseRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [nameDraft, setNameDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')
  const [dateFromDraft, setDateFromDraft] = useState('')
  const [dateToDraft, setDateToDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')

  const [nameQuery, setNameQuery] = useState('')
  const [descQuery, setDescQuery] = useState('')
  const [dateFromQ, setDateFromQ] = useState('')
  const [dateToQ, setDateToQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')

  const [page, setPage] = useState(1)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch('/cases')
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const data = (await res.json()) as CaseRow[]
        if (!ignore) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  function applySearch() {
    setNameQuery(nameDraft.trim())
    setDescQuery(descDraft.trim())
    setDateFromQ(dateFromDraft)
    setDateToQ(dateToDraft)
    setStatusFilter(statusDraft)
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      const hay = `${r.id} ${r.caseName}`.toLowerCase()
      if (nameQuery && !hay.includes(nameQuery.toLowerCase())) return false
      if (descQuery && !(r.description ?? '').toLowerCase().includes(descQuery.toLowerCase()))
        return false
      if (r.createdAt) {
        const t = new Date(r.createdAt).getTime()
        if (dateFromQ) {
          const from = dayStart(new Date(dateFromQ).getTime())
          if (t < from) return false
        }
        if (dateToQ) {
          const to = dayEnd(new Date(dateToQ).getTime())
          if (t > to) return false
        }
      } else if (dateFromQ || dateToQ) {
        return false
      }
      return true
    })
  }, [rows, nameQuery, descQuery, dateFromQ, dateToQ, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [nameQuery, descQuery, dateFromQ, dateToQ, statusFilter])

  return (
    <AppShell active="cases">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <header>
              <h1 className="text-[clamp(2rem,6vw,3.125rem)] font-semibold leading-tight text-black">
                사건 목록
              </h1>
              <p className="mt-2 max-w-xl text-[18px] font-normal leading-snug text-[#252525] md:text-[20px]">
                최신 등록된 사건부터 확인할 수 있습니다.
              </p>
            </header>
            <Link
              to="/CaseRegister"
              className={`inline-flex h-[52px] min-h-[52px] w-full shrink-0 items-center justify-center md:h-[56px] md:min-h-[56px] md:min-w-[200px] md:w-auto ${figmaCls.btnPrimary}`}
            >
              + 사건 등록
            </Link>
          </div>

          {error ? (
            <p className="mb-4 rounded-[12px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
              {error}
            </p>
          ) : null}

          <div className="mb-5 flex flex-col flex-wrap gap-4 md:flex-row md:items-center md:gap-5">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="사건 이름 검색"
              className={`h-[56px] min-h-[56px] w-full min-w-0 flex-1 md:h-[70px] md:min-h-[70px] md:max-w-[245px] ${figmaCls.inputBox}`}
            />
            <input
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              placeholder="설명 검색"
              className={`h-[56px] min-h-[56px] w-full min-w-0 flex-1 md:h-[70px] md:min-h-[70px] md:max-w-[245px] ${figmaCls.inputBox}`}
            />
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center md:max-w-[320px]">
              <input
                type="date"
                value={dateFromDraft}
                onChange={(e) => setDateFromDraft(e.target.value)}
                className={`h-[56px] w-full min-w-0 md:h-[70px] ${figmaCls.inputBox}`}
                title="등록일 시작"
              />
              <span className="hidden shrink-0 text-[20px] font-semibold text-[#555] sm:inline">~</span>
              <input
                type="date"
                value={dateToDraft}
                onChange={(e) => setDateToDraft(e.target.value)}
                className={`h-[56px] w-full min-w-0 md:h-[70px] ${figmaCls.inputBox}`}
                title="등록일 종료"
              />
            </div>
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as typeof statusDraft)}
              className={`h-[56px] w-full md:h-[70px] md:max-w-[200px] ${figmaCls.inputBox}`}
            >
              <option value="ALL">전체 상태</option>
              <option value="OPEN">진행 중</option>
              <option value="CLOSED">종결됨</option>
            </select>
            <button
              type="button"
              onClick={applySearch}
              className={`h-[52px] min-h-[52px] w-full shrink-0 md:h-[56px] md:min-h-[56px] md:min-w-[120px] md:w-auto ${figmaCls.btnPrimary}`}
            >
              검색
            </button>
          </div>

          <p className="mb-3 font-['Inter',sans-serif] text-[15px] text-black">
            총 <span className="font-semibold">{filtered.length}</span>건 | 최신 등록순
          </p>

          <section className={`${figmaCls.panel} overflow-hidden`} style={{ boxShadow: figma.cardShadow }}>
            <div className="hidden border-b-2 border-[#d9d9d9] bg-[rgba(167,193,255,0.29)] text-center text-[15px] font-medium text-black lg:grid lg:grid-cols-[100px_1fr_120px_180px_88px]">
              <div className="border-r border-[#d9d9d9] py-3">번호</div>
              <div className="border-r border-[#d9d9d9] py-3">사건명</div>
              <div className="border-r border-[#d9d9d9] py-3">상태</div>
              <div className="border-r border-[#d9d9d9] py-3">등록일시</div>
              <div className="py-3">관리</div>
            </div>

            {loading ? (
              <p className="p-12 text-center text-[16px] text-[#666]">불러오는 중…</p>
            ) : pageRows.length === 0 ? (
              <p className="p-12 text-center text-[16px] text-[#666]">표시할 사건이 없습니다.</p>
            ) : (
              <ul>
                {pageRows.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-[#d9d9d9] last:border-b-0 lg:grid lg:grid-cols-[100px_1fr_120px_180px_88px] lg:items-center lg:text-center"
                  >
                    <div className="hidden px-2 py-4 font-semibold text-[#174DC0] lg:block">#{r.id}</div>
                    <div className="px-4 py-4 text-left lg:px-2">
                      <p className="text-[13px] font-semibold text-[#174DC0] lg:hidden">#{r.id}</p>
                      <p className="text-[16px] font-medium text-black">{r.caseName}</p>
                    </div>
                    <div className="px-4 py-1 text-[15px] text-[#374151] lg:px-2 lg:py-4">
                      {statusLabel(r.status)}
                    </div>
                    <div className="px-4 py-1 text-[14px] text-[#555] lg:px-2 lg:py-4">
                      {formatDate(r.createdAt)}
                    </div>
                    <div className="flex justify-end px-4 pb-4 lg:justify-center lg:px-2 lg:py-4 lg:pb-4">
                      <Link
                        to={`/CaseDetail/${r.id}`}
                        className="inline-flex rounded-[10px] border border-[#174DC0] bg-[rgba(167,193,255,0.29)] px-4 py-2 text-[14px] font-semibold text-[#081c47] hover:bg-[rgba(167,193,255,0.45)]"
                      >
                        상세 정보
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[10px] border border-[#d9d9d9] bg-white px-4 py-2 text-[14px] disabled:opacity-40"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={
                  n === page
                    ? 'min-w-[40px] rounded-[10px] bg-[#081c47] px-3 py-2 text-[14px] font-semibold text-white'
                    : 'min-w-[40px] rounded-[10px] border border-[#d9d9d9] bg-white px-3 py-2 text-[14px] text-[#374151] hover:bg-[#f3f4f6]'
                }
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-[10px] border border-[#d9d9d9] bg-white px-4 py-2 text-[14px] disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
