import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { figma, figmaCls } from '../design/tokens'
import { formatDepartmentLabel } from '../lib/departmentLabels'
import { apiFetch, readApiErrorMessage } from '../lib/api'

type MeState = {
  username: string
  userId?: string
  department: string
  role?: string
}

type CaseRow = {
  id: number
  caseName: string
  description?: string | null
  status?: string
  createdAt?: string
}

type EvidenceRow = {
  id: number
  caseId?: number | null
  fileName?: string
  itemType?: string
  itemName?: string
  holderUserId?: string | null
  holderUsername?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function parseMe(raw: unknown): MeState | null {
  const data = asRecord(raw)
  const nested = asRecord(data?.data) ?? data
  if (!nested) return null
  const username =
    typeof nested.username === 'string'
      ? nested.username
      : typeof nested.name === 'string'
        ? nested.name
        : ''
  const userId =
    toStringValue(nested.userId) ||
    toStringValue(nested.userid) ||
    toStringValue(nested.loginId) ||
    undefined
  const department =
    typeof nested.department === 'string' ? nested.department : ''
  const role = typeof nested.role === 'string' ? nested.role : undefined
  if (!username && !userId && !department) return null
  return { username: username || '—', userId, department, role }
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

function toNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toStringValue(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string'
    ? String(value)
    : ''
}

function parseEvidenceRow(item: unknown): EvidenceRow | null {
  const o = asRecord(item) ?? {}
  const id = toNumberValue(o.id ?? o.evidenceId ?? o.evidence_id)
  if (id === null) return null
  return {
    id,
    caseId: toNumberValue(o.caseId ?? o.case_id),
    fileName: toStringValue(o.fileName ?? o.file_name),
    itemType: toStringValue(o.itemType ?? o.item_type),
    itemName: toStringValue(o.itemName ?? o.item_name ?? o.evidenceName ?? o.evidence_name),
    holderUserId:
      toStringValue(o.holderUserId ?? o.holder_user_id ?? o.userId ?? o.user_id) || null,
    holderUsername: toStringValue(o.holderUsername ?? o.holder_username ?? o.username),
  }
}

function parseEvidenceList(raw: unknown): EvidenceRow[] {
  const data = asRecord(raw)
  const inner = Array.isArray(raw)
    ? raw
    : data && Array.isArray(data.data)
      ? data.data
      : data && Array.isArray(data.content)
        ? data.content
        : data && Array.isArray(data.items)
          ? data.items
          : []
  return inner
    .map(parseEvidenceRow)
    .filter((row): row is EvidenceRow => row !== null)
}

function caseStatusLabel(status: string | undefined): string {
  if (status === 'OPEN') return '수사 진행'
  if (status === 'CLOSED') return '종결'
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

function StatMini({
  title,
  value,
  accent,
}: {
  title: string
  value: string
  accent?: 'default' | 'orange'
}) {
  const border =
    accent === 'orange' ? 'border-[#FF8A00]/40' : 'border-[#D9D9D9]'
  return (
    <div
      className={`${figmaCls.panel} ${border} p-4 ${accent === 'orange' ? 'ring-1 ring-[#FF8A00]/30' : ''}`}
      style={{ boxShadow: figma.cardShadow }}
    >
      <p className="text-[14px] text-[#555]">{title}</p>
      <p className={`mt-2 text-[26px] font-semibold leading-none ${accent === 'orange' ? 'text-[#c2410c]' : 'text-[#081C47]'}`}>
        {value}
      </p>
    </div>
  )
}

export default function MyPage() {
  const [me, setMe] = useState<MeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [caseCount, setCaseCount] = useState<number | null>(null)
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null)
  const [handoverPending, setHandoverPending] = useState<number | null>(null)

  const [cases, setCases] = useState<CaseRow[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null)
  const [allEvidenceRows, setAllEvidenceRows] = useState<EvidenceRow[]>([])
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRow[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch('/auth/me')
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const raw = (await res.json()) as unknown
        if (!ignore) setMe(parseMe(raw))
      } catch (e) {
        if (!ignore)
          setError(e instanceof Error ? e.message : '프로필을 불러오지 못했습니다.')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!me?.userId) {
      setCaseCount(0)
      setEvidenceCount(0)
      setCases([])
      setAllEvidenceRows([])
      setSelectedCaseId(null)
      setCasesLoading(false)
      return
    }
    let ignore = false
    ;(async () => {
      try {
        const [hRes, listRes, evidenceRes] = await Promise.all([
          apiFetch('/handover/in-progress/count'),
          apiFetch('/cases'),
          apiFetch('/evidence/recent'),
        ])
        if (ignore) return
        if (hRes.ok) setHandoverPending(parseCount(await hRes.json()))
        if (listRes.ok && evidenceRes.ok) {
          const list = (await listRes.json()) as unknown
          const rows = Array.isArray(list) ? (list as CaseRow[]) : []
          const allEvidence = parseEvidenceList((await evidenceRes.json()) as unknown)
          const heldEvidence = allEvidence.filter((row) => row.holderUserId === me.userId)
          const heldCaseIds = new Set(
            heldEvidence
              .map((row) => row.caseId)
              .filter((caseId): caseId is number => typeof caseId === 'number'),
          )
          const visibleCases = rows.filter((row) => heldCaseIds.has(row.id))
          const visibleEvidence = allEvidence.filter(
            (row) => typeof row.caseId === 'number' && heldCaseIds.has(row.caseId),
          )
          setCases(visibleCases)
          setAllEvidenceRows(visibleEvidence)
          setCaseCount(visibleCases.length)
          setEvidenceCount(visibleEvidence.length)
          setSelectedCaseId((prev) =>
            prev !== null && heldCaseIds.has(prev)
              ? prev
              : (visibleCases[0]?.id ?? null),
          )
        }
      } catch {
        if (!ignore) {
          setCases([])
          setAllEvidenceRows([])
          setCaseCount(0)
          setEvidenceCount(0)
          setSelectedCaseId(null)
        }
      } finally {
        if (!ignore) setCasesLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [loading, me?.userId])

  useEffect(() => {
    if (selectedCaseId === null) {
      setEvidenceRows([])
      return
    }
    let ignore = false
    setEvidenceLoading(true)
    window.setTimeout(() => {
      if (ignore) return
      setEvidenceRows(allEvidenceRows.filter((row) => row.caseId === selectedCaseId))
      setEvidenceLoading(false)
    }, 0)
    return () => {
      ignore = true
    }
  }, [allEvidenceRows, selectedCaseId])

  const caseCountLabel = caseCount === null ? '—' : caseCount.toLocaleString('ko-KR')
  const evidenceCountLabel = evidenceCount === null ? '—' : evidenceCount.toLocaleString('ko-KR')
  const handoverLabel = handoverPending === null ? '—' : handoverPending.toLocaleString('ko-KR')

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) ?? null,
    [cases, selectedCaseId],
  )

  return (
    <AppShell active="mypage">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-8">
            <h1 className={figmaCls.titlePage}>마이페이지</h1>
            <p className={`mt-2 ${figmaCls.subtitle}`}>
              담당 업무 요약과 사건·증거물 목록을 확인합니다.
            </p>
          </header>

          {error ? (
            <p className="mb-6 rounded-[12px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-[16px] text-[#666]">불러오는 중…</p>
          ) : (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatMini title="담당 사건" value={`${caseCountLabel}건`} />
                <StatMini title="담당 증거물" value={`${evidenceCountLabel}건`} />
                <StatMini
                  title="인수인계 처리(참고)"
                  value={`${handoverLabel}건`}
                  accent="orange"
                />
                <div
                  className={`${figmaCls.panel} flex items-center gap-4 p-4`}
                  style={{ boxShadow: figma.cardShadow }}
                >
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-[#D9D9D9] bg-[rgba(167,193,255,0.35)] text-[13px] font-semibold text-[#081C47]"
                    aria-hidden
                  >
                    ME
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-semibold text-black">{me?.username ?? '—'}</p>
                    <p className="truncate text-[14px] text-[#555]">
                      {me?.userId ?? '—'} · {me?.department ? formatDepartmentLabel(me.department) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <section className={`${figmaCls.panel} mb-8 p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[18px] font-semibold text-black">인수인계 승인 요청</h2>
                  <span className="rounded-full bg-[#fdeaea] px-2.5 py-1 text-[12px] font-semibold text-[#b91c1c]">
                    API 연동 예정
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-[#555]">
                  이전 담당자 승인·알림은 백엔드 워크플로가 준비되면 이 영역에 카드 형태로 표시됩니다. 지금은{' '}
                  <Link to="/Handover" className="font-semibold text-[#174DC0] underline-offset-2 hover:underline">
                    인수인계
                  </Link>
                  화면에서 QR 스캔 후 인계 요청을 진행할 수 있습니다.
                </p>
                <div className="mt-5 rounded-[12px] border border-dashed border-[#D9D9D9] bg-[#fafafa] px-4 py-10 text-center text-[15px] text-[#888]">
                  대기 중인 승인 요청이 없습니다.
                </div>
              </section>

              <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                <section className={`${figmaCls.panel} overflow-hidden`} style={{ boxShadow: figma.cardShadow }}>
                  <div className="border-b-2 border-[#D9D9D9] bg-[rgba(167,193,255,0.29)] px-4 py-3">
                    <h2 className="text-[18px] font-semibold text-black">담당 사건</h2>
                  </div>
                  {casesLoading ? (
                    <p className="p-6 text-[15px] text-[#666]">불러오는 중…</p>
                  ) : cases.length === 0 ? (
                    <p className="p-6 text-[15px] text-[#666]">담당하고 있는 사건이 없습니다.</p>
                  ) : (
                    <ul className="max-h-[360px] divide-y divide-[#eee] overflow-auto">
                      {cases.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedCaseId(c.id)}
                            className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-[rgba(167,193,255,0.15)] ${
                              selectedCaseId === c.id ? 'bg-[rgba(167,193,255,0.29)]' : ''
                            }`}
                          >
                            <span className="text-[12px] font-semibold text-[#174DC0]">#{c.id}</span>
                            <span className="text-[16px] font-medium text-black">{c.caseName}</span>
                            <span className="text-[13px] text-[#666]">
                              {caseStatusLabel(c.status)} · {formatDate(c.createdAt)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className={`${figmaCls.panel} overflow-hidden`} style={{ boxShadow: figma.cardShadow }}>
                  <div className="border-b-2 border-[#D9D9D9] bg-[rgba(167,193,255,0.29)] px-4 py-3">
                    <h2 className="text-[18px] font-semibold text-black">선택 사건의 증거물</h2>
                    {selectedCase ? (
                      <p className="mt-1 text-[13px] text-[#555]">
                        {selectedCase.caseName}{' '}
                        <span className="text-[#174DC0]">#{selectedCase.id}</span>
                      </p>
                    ) : null}
                  </div>
                  {evidenceLoading ? (
                    <p className="p-6 text-[15px] text-[#666]">불러오는 중…</p>
                  ) : !selectedCaseId ? (
                    <p className="p-6 text-[15px] text-[#666]">사건을 선택하세요.</p>
                  ) : evidenceRows.length === 0 ? (
                    <p className="p-6 text-[15px] text-[#666]">등록된 증거물이 없습니다.</p>
                  ) : (
                    <div className="hidden border-b-2 border-[#D9D9D9] bg-[rgba(167,193,255,0.29)] text-[14px] font-medium text-black md:grid md:grid-cols-[1fr_120px_140px]">
                      <div className="border-r border-[#D9D9D9] px-3 py-2">품목 / 파일</div>
                      <div className="border-r border-[#D9D9D9] px-3 py-2 text-center">유형</div>
                      <div className="px-3 py-2 text-center">담당</div>
                    </div>
                  )}
                  {evidenceRows.length > 0 ? (
                    <ul>
                      {evidenceRows.map((r) => (
                        <li
                          key={r.id}
                          className="border-b border-[#eee] last:border-b-0 md:grid md:grid-cols-[1fr_120px_140px] md:items-center md:text-center"
                        >
                          <div className="px-4 py-3 text-left">
                            <p className="text-[12px] font-semibold text-[#174DC0] md:hidden">#{r.id}</p>
                            <p className="text-[15px] font-medium text-black">{r.itemName || r.fileName || r.itemType || '—'}</p>
                          </div>
                          <div className="px-4 py-1 text-[14px] text-[#555] md:px-2 md:py-3">
                            <span className="md:hidden font-medium text-[#888]">유형 </span>
                            {r.itemType || '—'}
                          </div>
                          <div className="px-4 pb-3 text-[14px] text-[#555] md:px-2 md:py-3 md:pb-3">
                            <span className="md:hidden font-medium text-[#888]">담당 </span>
                            {r.holderUsername || '—'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
                  <h2 className="text-[18px] font-semibold text-black">계정</h2>
                  <dl className="mt-4 space-y-3 text-[15px]">
                    <div className="flex justify-between gap-4 border-b border-[#eee] pb-3">
                      <dt className="text-[#666]">이름</dt>
                      <dd className="font-medium text-black">{me?.username ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#eee] pb-3">
                      <dt className="text-[#666]">Officer ID</dt>
                      <dd className="font-medium text-[#174DC0]">{me?.userId ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#666]">직급</dt>
                      <dd className="font-medium text-black">{me?.role ?? '—'}</dd>
                    </div>
                  </dl>
                </section>

                <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
                  <h2 className="text-[18px] font-semibold text-black">소속</h2>
                  <p className="mt-4 text-[20px] font-medium text-[#081C47]">
                    {me?.department ? formatDepartmentLabel(me.department) : '—'}
                  </p>
                </section>
              </div>
            </>
          )}

          <p className="mt-10 text-center">
            <Link to="/home" className="text-[15px] font-semibold text-[#174DC0] hover:underline">
              홈으로
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  )
}
