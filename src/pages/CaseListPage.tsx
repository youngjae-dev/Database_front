import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
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

export default function CaseListPage() {
  const [rows, setRows] = useState<CaseRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (!q) return true
      const hay = `${r.id} ${r.caseName}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query, statusFilter])

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
  }, [query, statusFilter])

  return (
    <AppShell active="cases">
      <div className="p-8 pb-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[40px] font-semibold leading-tight text-black">사건 목록</h1>
            <p className="mt-2 text-[18px] text-[#555]">
              최신 등록된 사건부터 확인할 수 있습니다.
            </p>
          </div>
          <Link
            to="/CaseRegister"
            className="inline-flex items-center justify-center rounded-[14px] bg-[#081c47] px-8 py-3 text-[18px] font-semibold text-white shadow-sm transition hover:bg-[#0a2560]"
          >
            + 사건등록
          </Link>
        </div>

        {error ? (
          <p className="mb-4 rounded-[12px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
            {error}
          </p>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 rounded-[14px] border border-[#d9d9d9] bg-white p-4 shadow-sm md:flex-row md:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-[52px] min-w-[140px] rounded-[10px] border-2 border-[#d9d9d9] bg-white px-4 text-[16px] text-[#252525] outline-none focus:border-[#081c47]"
          >
            <option value="ALL">전체 상태</option>
            <option value="OPEN">진행 중</option>
            <option value="CLOSED">종결됨</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="사건번호 또는 사건명으로 검색하세요"
            className="h-[52px] min-w-0 flex-1 rounded-[10px] border-2 border-[#d9d9d9] px-4 text-[16px] outline-none placeholder:text-[#9ca3af] focus:border-[#081c47]"
          />
          <button
            type="button"
            className="h-[52px] shrink-0 rounded-[10px] bg-[#081c47] px-8 text-[16px] font-semibold text-white"
          >
            검색
          </button>
        </div>

        <section className="overflow-hidden rounded-[14px] border border-[#d9d9d9] bg-white shadow-[0_4px_24px_rgba(8,28,71,0.06)]">
          <div className="hidden grid-cols-[100px_1fr_120px_180px_100px_88px] border-b border-[#d9d9d9] bg-[rgba(167,193,255,0.35)] text-center text-[15px] font-semibold text-[#081c47] lg:grid">
            <div className="border-r border-[#d9d9d9] py-4">번호</div>
            <div className="border-r border-[#d9d9d9] py-4">사건명</div>
            <div className="border-r border-[#d9d9d9] py-4">상태</div>
            <div className="border-r border-[#d9d9d9] py-4">등록일시</div>
            <div className="border-r border-[#d9d9d9] py-4">유형</div>
            <div className="py-4">관리</div>
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
                  className="border-b border-[#ececec] last:border-b-0 lg:grid lg:grid-cols-[100px_1fr_120px_180px_100px_88px] lg:items-center lg:text-center"
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
                  <div className="px-4 py-1 text-[14px] text-[#9ca3af] lg:px-2 lg:py-4">—</div>
                  <div className="flex justify-end px-4 pb-4 lg:justify-center lg:px-2 lg:py-4 lg:pb-4">
                    <Link
                      to={`/CaseDetail/${r.id}`}
                      className="inline-flex rounded-[10px] border border-[#174DC0] bg-[rgba(167,193,255,0.35)] px-4 py-2 text-[14px] font-semibold text-[#081c47] hover:bg-[rgba(167,193,255,0.55)]"
                    >
                      상세
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
    </AppShell>
  )
}
