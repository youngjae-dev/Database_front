import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import HandoverQrScanner from '../components/HandoverQrScanner'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'

type QrLookup = {
  evidenceId: number
  caseId: number
  caseName: string
  itemType: string
  fileName: string
  initialHash: string
  holderUserId: string
  holderUsername: string
}

type Candidate = { userId: string; username: string }

type CustodyLogRow = {
  id?: number
  action?: string
  actionTime?: string
  previousHash?: string
  currentHash?: string
  user?: { username?: string }
  fromUser?: { username?: string } | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function parseQrLookup(raw: unknown): QrLookup | null {
  const o = asRecord(raw)
  if (!o) return null
  const evidenceId = Number(o.evidenceId)
  const caseId = Number(o.caseId)
  if (!Number.isFinite(evidenceId) || !Number.isFinite(caseId)) return null
  return {
    evidenceId,
    caseId,
    caseName: typeof o.caseName === 'string' ? o.caseName : '',
    itemType: typeof o.itemType === 'string' ? o.itemType : '',
    fileName: typeof o.fileName === 'string' ? o.fileName : '',
    initialHash: typeof o.initialHash === 'string' ? o.initialHash : '',
    holderUserId: typeof o.holderUserId === 'string' ? o.holderUserId : '',
    holderUsername: typeof o.holderUsername === 'string' ? o.holderUsername : '',
  }
}

function actionTitle(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return '등록 완료'
  if (action === 'TRANSFER') return '인수인계'
  return action ?? '기록'
}

function actionDesc(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return '증거물이 시스템에 등록되었습니다.'
  if (action === 'TRANSFER') return '담당자 변경이 체인에 기록되었습니다.'
  return '보관 이력이 갱신되었습니다.'
}

function actionColor(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return 'bg-emerald-500'
  if (action === 'TRANSFER') return 'bg-orange-500'
  return 'bg-[#174DC0]'
}

export default function HandoverPage() {
  const [scanOpen, setScanOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<QrLookup | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupErr, setLookupErr] = useState<string | null>(null)

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [toUserId, setToUserId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  const [history, setHistory] = useState<CustodyLogRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadCandidates = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/handover-candidates')
      if (!res.ok) return
      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) return
      const rows: Candidate[] = data
        .map((x) => {
          const r = asRecord(x)
          if (!r) return null
          const userId = typeof r.userId === 'string' ? r.userId : ''
          const username = typeof r.username === 'string' ? r.username : ''
          if (!userId) return null
          return { userId, username }
        })
        .filter((x): x is Candidate => x !== null)
      setCandidates(rows)
    } catch {
      setCandidates([])
    }
  }, [])

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  const performLookup = useCallback(async (hash: string) => {
    setLookupErr(null)
    setSubmitMsg(null)
    setLookupLoading(true)
    try {
      const q = encodeURIComponent(hash)
      const res = await apiFetch(`/evidence/qr-lookup?hash=${q}`)
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const raw = (await res.json()) as unknown
      const parsed = parseQrLookup(raw)
      if (!parsed) throw new Error('응답 형식이 올바르지 않습니다.')
      setLookup(parsed)
      setToUserId('')
    } catch (e) {
      setLookup(null)
      setLookupErr(e instanceof Error ? e.message : '조회에 실패했습니다.')
    } finally {
      setLookupLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!lookup?.evidenceId) {
      setHistory([])
      return
    }
    let ignore = false
    setHistoryLoading(true)
    apiFetch(`/evidence/${lookup.evidenceId}/history`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        return res.json() as Promise<unknown>
      })
      .then((data) => {
        if (ignore) return
        setHistory(Array.isArray(data) ? (data as CustodyLogRow[]) : [])
      })
      .catch(() => {
        if (!ignore) setHistory([])
      })
      .finally(() => {
        if (!ignore) setHistoryLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [lookup?.evidenceId])

  const onQrDecoded = useCallback(
    (text: string) => {
      setScanOpen(false)
      setScanError(null)
      void performLookup(text)
    },
    [performLookup],
  )

  const submitTransfer = async () => {
    if (!lookup) return
    setSubmitMsg(null)
    if (!toUserId) {
      setSubmitMsg('새 담당자를 선택하세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/evidence/transfer', {
        method: 'POST',
        body: JSON.stringify({
          evidenceId: lookup.evidenceId,
          toUserId,
          scannedHash: lookup.initialHash,
        }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const data = (await res.json()) as { message?: string }
      setSubmitMsg(data.message ?? '인수인계가 완료되었습니다.')
      void performLookup(lookup.initialHash)
      void loadCandidates()
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : '인계 요청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const displayItemName = useMemo(() => {
    if (!lookup) return '—'
    return lookup.fileName?.trim() || lookup.itemType || '—'
  }, [lookup])

  return (
    <AppShell active="handover">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1000px]">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className={figmaCls.titlePage}>인수인계</h1>
              <p className={`mt-2 max-w-2xl ${figmaCls.subtitle}`}>
                QR 스캔으로 무결성을 확인한 뒤, 새 담당자에게 인계합니다. 기존 QR은 재발행하지 않습니다.
              </p>
            </div>
          </header>

          <section
            className={`mb-6 flex gap-3 rounded-[12px] border-2 border-[#D9D9D9] bg-[rgba(167,193,255,0.18)] px-4 py-3 md:items-center md:px-5`}
          >
            <span className="text-[22px]" aria-hidden>
              ⛓
            </span>
            <p className="text-[15px] leading-relaxed text-[#252525]">
              승인 후 체인에 인수인계 이력이 추가됩니다. 스캔한 해시는 증거물 등록 시 발급된{' '}
              <span className="font-semibold text-[#081C47]">initialHash</span>와 일치해야 합니다.
            </p>
          </section>

          <section className={`${figmaCls.panel} p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-[20px] font-semibold text-black">QR 스캔</h2>
                <p className="mt-1 text-[15px] text-[#555]">카메라로 QR을 읽어 증거물을 조회합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScanError(null)
                  setScanOpen(true)
                }}
                className={`inline-flex h-[48px] shrink-0 items-center justify-center gap-2 whitespace-nowrap px-5 ${figmaCls.btnPrimary}`}
              >
                <span aria-hidden>▣</span>
                QR 스캔 시작
              </button>
            </div>
          </section>

          {lookupErr ? (
            <p className="mt-4 rounded-[12px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
              {lookupErr}
            </p>
          ) : null}

          {lookupLoading ? (
            <p className="mt-6 text-center text-[15px] text-[#666]">증거물 정보를 불러오는 중…</p>
          ) : null}

          {lookup ? (
            <>
              <section
                className={`mt-6 ${figmaCls.panel} overflow-hidden p-0`}
                style={{ boxShadow: figma.cardShadow }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#D9D9D9] px-5 py-4">
                  <h2 className="text-[20px] font-semibold text-black">QR 스캔 결과</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-semibold text-emerald-800">
                    QR 검증 완료
                  </span>
                </div>
                <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-[#eee]">
                  {[
                    ['사건', lookup.caseName],
                    ['사건 ID', String(lookup.caseId)],
                    ['증거물 ID', String(lookup.evidenceId)],
                    ['증거물명', displayItemName],
                    ['현재 담당자', `${lookup.holderUsername} (${lookup.holderUserId})`],
                    ['인계 사유(참고)', reason.trim() ? `${reason.slice(0, 48)}${reason.length > 48 ? '…' : ''}` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col border-b border-[#eee] px-5 py-4 last:border-b-0 md:border-b-0">
                      <span className="text-[13px] font-medium text-[#666]">{k}</span>
                      <span className="mt-1 text-[16px] font-medium text-black">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className={`mt-5 flex gap-3 rounded-[12px] border-2 px-4 py-4`}
                style={{
                  borderColor: figma.alertOrangeBorder,
                  backgroundColor: figma.alertOrangeBg,
                }}
              >
                <span className="text-[22px]" aria-hidden>
                  ⏳
                </span>
                <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-[#252525]">
                  QR 검증이 완료되었습니다. 아래에서 새 담당자를 선택한 뒤 <strong>인계 요청</strong>을 보내세요.
                  실제 승인 워크플로가 있을 경우 이전 담당자는 <Link className="font-semibold text-[#081C47] underline" to="/MyPage">마이페이지</Link>에서 처리할 수 있습니다.
                </div>
              </section>

              <section className={`mt-6 ${figmaCls.panel} p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
                <h2 className="text-[18px] font-semibold text-black">인계 요청</h2>
                <label className="mt-4 block text-[15px] font-medium text-[#252525]">
                  새 담당자 (Officer ID)
                </label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className={`mt-2 w-full max-w-md ${figmaCls.inputBox}`}
                >
                  <option value="">담당자 선택</option>
                  {candidates.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.username} ({c.userId})
                    </option>
                  ))}
                </select>
                <label className="mt-5 block text-[15px] font-medium text-[#252525]">인계 사유 (선택, 200자)</label>
                <textarea
                  value={reason}
                  maxLength={200}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className={`mt-2 w-full resize-y ${figmaCls.inputBox}`}
                  placeholder="인계 사유를 입력하세요"
                />
                <p className="mt-1 text-right text-[13px] text-[#888]">{reason.length}/200</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submitTransfer()}
                    className={`inline-flex min-h-[48px] min-w-[160px] items-center justify-center whitespace-nowrap px-6 ${figmaCls.btnPrimary} disabled:opacity-50`}
                  >
                    {submitting ? '처리 중…' : '인계 요청'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLookup(null)
                      setSubmitMsg(null)
                      setLookupErr(null)
                    }}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-[15px] border-2 border-[#D9D9D9] bg-white px-5 text-[15px] font-semibold text-[#081C47]"
                  >
                    초기화
                  </button>
                </div>
                {submitMsg ? (
                  <p className="mt-4 rounded-[10px] border border-[#D9D9D9] bg-white px-4 py-3 text-[15px] text-[#081C47]">
                    {submitMsg}
                  </p>
                ) : null}
              </section>

              <section className="mt-10">
                <h2 className="text-[22px] font-semibold text-black">보관 이력 타임라인</h2>
                <p className="mt-1 text-[15px] text-[#555]">
                  증거물의 등록·인수인계 체인 기록입니다.
                </p>
                <div className={`mt-5 ${figmaCls.panel} p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
                  {historyLoading ? (
                    <p className="text-[15px] text-[#666]">이력을 불러오는 중…</p>
                  ) : history.length === 0 ? (
                    <p className="text-[15px] text-[#666]">표시할 이력이 없습니다.</p>
                  ) : (
                    <div className="relative space-y-0 pl-2">
                      <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-[#D9D9D9]" aria-hidden />
                      {history.map((row, idx) => {
                        const last = idx === history.length - 1
                        const title = actionTitle(row.action)
                        const desc = actionDesc(row.action)
                        const who =
                          row.action === 'TRANSFER' && row.fromUser?.username
                            ? `${row.fromUser.username} → ${row.user?.username ?? '—'}`
                            : (row.user?.username ?? '—')
                        return (
                          <div key={row.id ?? idx} className="relative flex gap-4 pb-8 last:pb-0">
                            <div
                              className={`relative z-[1] mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${actionColor(row.action)}`}
                            >
                              <span className="text-[12px] font-bold">{idx + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1 rounded-[12px] border border-[#ececec] bg-[#fafafa] px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[16px] font-semibold text-black">{title}</span>
                                {last ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                    최근 기록
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-[14px] text-[#555]">{desc}</p>
                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
                                <span>
                                  <span className="text-[#888]">담당·흐름 </span>
                                  <span className="font-medium text-black">{who}</span>
                                </span>
                                <span>
                                  <span className="text-[#888]">일시 </span>
                                  <span className="font-medium text-black">{row.actionTime ?? '—'}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}

          <p className="mt-10 text-center">
            <Link to="/home" className="text-[15px] font-semibold text-[#174DC0] hover:underline">
              홈으로
            </Link>
          </p>
        </div>
      </div>

      {scanOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR 스캔"
        >
          <div className={`relative w-full max-w-md ${figmaCls.panel} p-5 shadow-xl`}>
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg px-2 py-1 text-[22px] leading-none text-[#666] hover:bg-black/5"
              onClick={() => {
                setScanOpen(false)
                setScanError(null)
              }}
              aria-label="닫기"
            >
              ×
            </button>
            <h3 className="pr-8 text-[18px] font-semibold text-black">QR 스캔</h3>
            <p className="mt-1 text-[14px] text-[#666]">증거물에 부착된 QR을 카메라에 맞춰 주세요.</p>
            {scanError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-800">{scanError}</p>
            ) : null}
            <div className="mt-4">
              <HandoverQrScanner
                active={scanOpen}
                onResult={onQrDecoded}
                onError={(m) => setScanError(m)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
