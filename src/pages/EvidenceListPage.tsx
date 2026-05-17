import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'
import {
  formatEvidenceDate,
  parseEvidenceList,
  parseEvidenceNameType,
  type EvidenceSummary,
} from '../lib/evidenceDisplay'

export default function EvidenceListPage() {
  const [rows, setRows] = useState<EvidenceSummary[]>([])
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch('/evidence/recent')
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const data = (await res.json()) as unknown
        if (!ignore) setRows(parseEvidenceList(data))
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
      const display = parseEvidenceNameType(r)
      const hay = [r.evidenceId, r.fileName, display.name, display.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (q && !hay.includes(q)) return false
      if (r.createdAt) {
        const t = new Date(r.createdAt).getTime()
        if (Number.isNaN(t)) return !(dateFrom || dateTo)
        if (dateFrom) {
          const from = new Date(dateFrom)
          from.setHours(0, 0, 0, 0)
          if (t < from.getTime()) return false
        }
        if (dateTo) {
          const to = new Date(dateTo)
          to.setHours(23, 59, 59, 999)
          if (t > to.getTime()) return false
        }
      } else if (dateFrom || dateTo) {
        return false
      }
      return true
    })
  }, [rows, query, dateFrom, dateTo])

  return (
    <AppShell active="evidence">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className={figmaCls.titlePage}>증거물 목록</h1>
            <p className={`mt-2 max-w-xl ${figmaCls.subtitle}`}>
              최근 등록된 증거물부터 확인할 수 있습니다.
            </p>
          </div>
          <Link
            to="/EvidenceRegister"
            className={`inline-flex h-[52px] min-h-[52px] w-full shrink-0 items-center justify-center md:h-[56px] md:min-h-[56px] md:min-w-[220px] md:w-auto ${figmaCls.btnPrimary}`}
          >
            + 증거물 등록
          </Link>
        </div>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full ${figmaCls.inputBox}`}
              placeholder="증거물 번호·파일명·유형으로 검색"
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:max-w-[320px]">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`h-[56px] w-full min-w-0 ${figmaCls.inputBox}`}
              title="등록일 시작"
            />
            <span className="hidden shrink-0 text-[20px] font-semibold text-[#555] sm:inline">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`h-[56px] w-full min-w-0 ${figmaCls.inputBox}`}
              title="등록일 종료"
            />
          </div>
        </div>

        <p className="mb-3 font-['Inter',sans-serif] text-[15px] text-black">
          총 <span className="font-semibold">{filtered.length}</span>건
          {query.trim() ? ' (필터 적용)' : ''} | 최신 등록순
        </p>

        {error ? (
          <p className="mb-4 rounded-[10px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
            {error}
          </p>
        ) : null}

        <section className={`${figmaCls.panel} overflow-hidden`} style={{ boxShadow: figma.cardShadow }}>
          <div className="grid grid-cols-1 gap-0 border-b border-[#d9d9d9] bg-[rgba(167,193,255,0.29)] text-center text-[15px] font-medium text-black md:grid-cols-[120px_1fr_120px_140px_100px_100px]">
            <div className="hidden border-r border-[#d9d9d9] p-3 md:block">증거물 번호</div>
            <div className="hidden border-r border-[#d9d9d9] p-3 md:block">증거물명</div>
            <div className="hidden border-r border-[#d9d9d9] p-3 md:block">유형</div>
            <div className="hidden border-r border-[#d9d9d9] p-3 md:block">등록일시</div>
            <div className="hidden border-r border-[#d9d9d9] p-3 md:block">담당자</div>
            <div className="hidden p-3 md:block">관리</div>
            <div className="p-3 md:hidden">증거물 목록</div>
          </div>

          {loading ? (
            <p className="p-10 text-center text-[15px] text-[#666]">불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-center text-[15px] text-[#666]">
              표시할 증거물이 없습니다.
            </p>
          ) : (
            <ul>
              {filtered.map((r) => {
                const display = parseEvidenceNameType(r)
                const formattedDate = formatEvidenceDate(r.createdAt)
                
                return (
                  <li
                    key={r.evidenceId ?? display.name}
                    className="grid border-t border-[#d9d9d9] text-[14px] md:grid-cols-[120px_1fr_120px_140px_100px_100px] md:items-center md:text-center"
                  >
                    <div className="border-[#d9d9d9] p-3 font-semibold text-[#174dc0] md:border-r">
                      {r.evidenceId || '—'}
                    </div>
                    <div className="border-[#d9d9d9] p-3 text-left text-black md:border-r">{display.name}</div>
                    <div className="border-[#d9d9d9] p-3 md:border-r">{display.type}</div>
                    <div className="border-[#d9d9d9] p-3 text-[13px] text-[#555] md:border-r">{formattedDate}</div>
                    <div className="border-[#d9d9d9] p-3 text-[13px] text-[#555] md:border-r">{r.handler || '—'}</div>
                    <div className="flex flex-wrap items-center justify-center gap-2 p-2">
                      <Link
                        to={`/EvidenceDetail/${r.evidenceId}`}
                        className="rounded-[10px] border border-[#174dc0] bg-[rgba(167,193,255,0.29)] px-3 py-1.5 text-[13px] font-medium text-black hover:bg-[rgba(167,193,255,0.45)]"
                      >
                        상세 정보
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        </div>
      </div>
    </AppShell>
  )
}
