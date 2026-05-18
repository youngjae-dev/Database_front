import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import HandoverQrScanner from '../components/HandoverQrScanner'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'
import { formatDepartmentLabel } from '../lib/departmentLabels'

type QrLookup = {
  evidenceId: number
  caseId: number
  caseName: string
  itemType: string
  fileName: string
  initialHash: string
  holderUserId: string
  holderUsername: string
  holderRole?: string
  holderDepartment?: string
}

type MeState = {
  userId: string
  username: string
  role?: string
  department?: string
}

type PersonInfo = {
  id?: string
  userId?: string
  username?: string
  role?: string
  department?: string
}

type CustodyLogRow = {
  id?: number
  action?: string
  actionTime?: string
  previousHash?: string
  currentHash?: string
  user?: PersonInfo
  fromUser?: PersonInfo | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function toText(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string'
    ? String(value)
    : ''
}

function parseMe(raw: unknown): MeState | null {
  const data = asRecord(raw)
  const nested = asRecord(data?.data) ?? data
  if (!nested) return null
  const userId =
    toText(nested.userId) ||
    toText(nested.userid) ||
    toText(nested.loginId)
  const username =
    toText(nested.username) ||
    toText(nested.name)
  if (!userId && !username) return null
  return {
    userId,
    username: username || '—',
    role: toText(nested.role),
    department: toText(nested.department),
  }
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
    caseName: toText(o.caseName),
    itemType: toText(o.itemType),
    fileName: toText(o.fileName),
    initialHash: toText(o.initialHash),
    holderUserId: toText(o.holderUserId),
    holderUsername: toText(o.holderUsername),
    holderRole: toText(o.holderRole),
    holderDepartment: toText(o.holderDepartment),
  }
}

function formatPerson(info: PersonInfo | null | undefined, fallback = '—'): string {
  if (!info) return fallback
  const username = info.username?.trim()
  const userId = info.userId?.trim() || info.id?.trim()
  const role = info.role?.trim()
  const department = info.department?.trim()
    ? formatDepartmentLabel(info.department)
    : ''
  const main = username || userId || fallback
  const meta = [department, role].filter(Boolean).join(' · ')
  return meta ? `${main} (${meta})` : main
}

function actionTitle(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return '등록 완료'
  if (action === 'TRANSFER') return '인수인계'
  if (action === 'TRANSFER_REQUESTED') return '인수 요청'
  if (action === 'TRANSFER_APPROVED') return '요청 승인'
  if (action === 'TRANSFER_REJECTED') return '요청 거절'
  if (action === 'EVIDENCE_DELETE') return '삭제 처리'
  return action ? '기록' : '기록'
}

function actionDesc(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return '증거물이 시스템에 등록되었습니다.'
  if (action === 'TRANSFER') return '담당자 변경이 체인에 기록되었습니다.'
  if (action === 'TRANSFER_REQUESTED') return '새 담당자가 인수 승인을 요청했습니다.'
  if (action === 'TRANSFER_APPROVED') return '이전 담당자가 인수인계를 승인했습니다.'
  if (action === 'TRANSFER_REJECTED') return '이전 담당자가 인수인계를 거절했습니다.'
  if (action === 'EVIDENCE_DELETE') return '관리자가 증거물을 삭제 상태로 변경했습니다.'
  return '보관 이력이 갱신되었습니다.'
}

function actionColor(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return 'bg-emerald-500'
  if (action === 'TRANSFER') return 'bg-orange-500'
  if (action === 'TRANSFER_REQUESTED') return 'bg-blue-500'
  if (action === 'TRANSFER_APPROVED') return 'bg-indigo-500'
  if (action === 'TRANSFER_REJECTED') return 'bg-slate-500'
  if (action === 'EVIDENCE_DELETE') return 'bg-red-500'
  return 'bg-[#174DC0]'
}

function isHashChainAction(action: string | undefined): boolean {
  return action === 'INITIAL_REGISTRATION' || action === 'TRANSFER'
}

export default function HandoverPage() {
  const [scanOpen, setScanOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<QrLookup | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupErr, setLookupErr] = useState<string | null>(null)

  const [me, setMe] = useState<MeState | null>(null)
  const [meLoading, setMeLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  const [history, setHistory] = useState<CustodyLogRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch('/auth/me')
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const parsed = parseMe((await res.json()) as unknown)
        if (!ignore) setMe(parsed)
      } catch {
        if (!ignore) setMe(null)
      } finally {
        if (!ignore) setMeLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

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
    if (!me?.userId) {
      setSubmitMsg('현재 로그인 사용자 정보를 확인할 수 없습니다.')
      return
    }
    const sameHolder =
      lookup.holderUserId === me.userId ||
      (!!lookup.holderUsername && lookup.holderUsername === me.username)
    if (sameHolder) {
      const msg = '해당 증거물을 이미 소지하고 있습니다.'
      window.alert(msg)
      setSubmitMsg(msg)
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/handover/requests', {
        method: 'POST',
        body: JSON.stringify({
          evidenceId: lookup.evidenceId,
          scannedHash: lookup.initialHash,
          reason: reason.trim(),
        }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const successMessage = '이전 담당자에게 인수인계 승인 요청을 보냈습니다.'
      window.alert(successMessage)
      setSubmitMsg(successMessage)
      void performLookup(lookup.initialHash)
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : '인계 요청에 실패했습니다.'
      const displayMessage =
        rawMessage.includes('증거물의 소유자가 아닙니다') ||
        rawMessage.includes('인계 권한이 없습니다')
          ? '백엔드에서 현재 요청자를 인계자로 검사해 인수 요청이 거부되었습니다.'
          : rawMessage
      setSubmitMsg(displayMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const displayItemName = useMemo(() => {
    if (!lookup) return '—'
    return lookup.fileName?.trim() || lookup.itemType || '—'
  }, [lookup])

  const holderInfo = useMemo<PersonInfo | null>(() => {
    if (!lookup) return null
    return {
      userId: lookup.holderUserId,
      username: lookup.holderUsername,
      role: lookup.holderRole,
      department: lookup.holderDepartment,
    }
  }, [lookup])

  const isCurrentHolder = useMemo(() => {
    if (!lookup || !me) return false
    return lookup.holderUserId === me.userId || (!!lookup.holderUsername && lookup.holderUsername === me.username)
  }, [lookup, me])

  const hashChainHistory = useMemo(
    () => history.filter((row) => isHashChainAction(row.action)),
    [history],
  )
  const requestHistory = useMemo(
    () => history.filter((row) => !isHashChainAction(row.action)),
    [history],
  )

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
                    ['현재 담당자', `${formatPerson(holderInfo)} / ID ${lookup.holderUserId || '—'}`],
                    ['인수 사유(참고)', reason.trim() ? `${reason.slice(0, 48)}${reason.length > 48 ? '…' : ''}` : '—'],
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
                  QR 검증이 완료되었습니다. 현재 로그인된 사용자가 인수자로 자동 입력됩니다. 아래에서 <strong>인계 요청</strong>을 보내면 이전 담당자의 마이페이지에 승인 요청이 표시됩니다.
                </div>
              </section>

              <section className={`mt-6 ${figmaCls.panel} p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
                <h2 className="text-[18px] font-semibold text-black">인수 요청</h2>
                <label className="mt-4 block text-[15px] font-medium text-[#252525]">
                  인수자
                </label>
                <div className="mt-2 w-full max-w-md rounded-[10px] border-2 border-[#d9d9d9] bg-[#f8fafc] px-4 py-3 text-[16px] text-[#081C47]">
                  {meLoading ? '로그인 사용자 확인 중…' : me ? `${formatPerson(me)} / ID ${me.userId || '—'}` : '로그인 사용자 정보 없음'}
                </div>
                <label className="mt-5 block text-[15px] font-medium text-[#252525]">인수 사유 (선택, 200자)</label>
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
                    disabled={submitting || meLoading || !me?.userId}
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
                <h2 className="text-[22px] font-semibold text-black">해시체인 타임라인</h2>
                <p className="mt-1 text-[15px] text-[#555]">
                  해시가 실제로 생성되는 최초 등록과 인수인계 완료 기록만 중심으로 표시합니다.
                </p>
                <div className={`mt-5 ${figmaCls.panel} p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
                  {historyLoading ? (
                    <p className="text-[15px] text-[#666]">이력을 불러오는 중…</p>
                  ) : (
                    <div className="relative space-y-0">
                      <div className="absolute bottom-2 left-5 top-2 w-0.5 -translate-x-1/2 bg-[#D9D9D9]" aria-hidden />
                      {hashChainHistory.length === 0 ? (
                        <div className="relative flex gap-4 pb-8">
                          <div className="relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full bg-[#174DC0] text-white shadow-sm">
                            <span className="text-[12px] font-bold">1</span>
                          </div>
                          <div className="min-w-0 flex-1 rounded-[12px] border border-[#A7C1FF] bg-[rgba(167,193,255,0.16)] px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[16px] font-semibold text-black">현재 보관 상태</span>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                현재
                              </span>
                            </div>
                            <p className="mt-1 text-[14px] text-[#555]">QR로 확인된 현재 담당자 정보입니다.</p>
                            <div className="mt-3 text-[14px]">
                              <span className="text-[#888]">현재 담당자 </span>
                              <span className="font-medium text-black">
                                {formatPerson(holderInfo)} / ID {lookup.holderUserId || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {hashChainHistory.map((row, idx) => {
                        const last = idx === hashChainHistory.length - 1
                        const title = actionTitle(row.action)
                        const desc = actionDesc(row.action)
                        const phase = last ? '현재' : '과거'
                        const who =
                          row.action === 'TRANSFER' && row.fromUser
                            ? `${formatPerson(row.fromUser)} → ${formatPerson(row.user)}`
                            : formatPerson(row.user)
                        return (
                          <div key={row.id ?? idx} className="relative flex gap-4 pb-8">
                            <div
                              className={`relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${last ? 'bg-[#174DC0]' : actionColor(row.action)}`}
                            >
                              <span className="text-[12px] font-bold">{idx + 1}</span>
                            </div>
                            <div className={`min-w-0 flex-1 rounded-[12px] border px-4 py-3 ${last ? 'border-[#A7C1FF] bg-[rgba(167,193,255,0.16)]' : 'border-[#ececec] bg-[#fafafa]'}`}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[16px] font-semibold text-black">{title}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${last ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700'}`}>
                                  {phase}
                                </span>
                                {last ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                    현재 담당 기준
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
                      <div className="relative flex gap-4">
                        <div className={`relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm ${isCurrentHolder ? 'bg-emerald-500 text-white' : 'border-2 border-[#bdbdbd] bg-[#f2f2f2] text-[#777] grayscale'}`}>
                          <span className="text-[12px] font-bold">{hashChainHistory.length > 0 ? hashChainHistory.length + 1 : 2}</span>
                        </div>
                        <div className={`min-w-0 flex-1 rounded-[12px] border px-4 py-3 ${isCurrentHolder ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-dashed border-[#bdbdbd] bg-[#f7f7f7] text-[#666] grayscale'}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[16px] font-semibold ${isCurrentHolder ? 'text-emerald-950' : 'text-[#555]'}`}>
                              {isCurrentHolder ? '인수 완료' : '인수 예정'}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isCurrentHolder ? 'bg-emerald-100 text-emerald-900' : 'bg-[#e5e5e5] text-[#666]'}`}>
                              {isCurrentHolder ? '현재' : '미래'}
                            </span>
                            {!isCurrentHolder ? (
                              <span className="rounded-full bg-[#eeeeee] px-2 py-0.5 text-[11px] font-semibold text-[#777]">
                                미진행
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[14px] text-[#666]">
                            {isCurrentHolder
                              ? '승인 완료 후 현재 로그인 사용자가 이 증거물의 담당자로 기록되어 있습니다.'
                              : '인계 요청을 누르면 이전 담당자의 마이페이지에 승인 알림이 생성됩니다.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
                            <span>
                              <span className="text-[#888]">{isCurrentHolder ? '현재 담당' : '예정 흐름'} </span>
                              <span className="font-medium text-[#555]">
                                {isCurrentHolder
                                  ? `${formatPerson(holderInfo, '현재 담당자')} / ID ${lookup.holderUserId || '—'}`
                                  : `${formatPerson(holderInfo, '현재 담당자')} → ${formatPerson(me, '로그인 사용자')}`}
                              </span>
                            </span>
                            <span>
                              <span className="text-[#888]">상태 </span>
                              <span className="font-medium text-[#555]">{isCurrentHolder ? '인수 완료' : '요청 전'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className={`mt-5 ${figmaCls.panel} p-5 md:p-6`} style={{ boxShadow: figma.cardShadow }}>
                <h2 className="text-[20px] font-semibold text-black">인수인계 요청 기록</h2>
                <p className="mt-1 text-[15px] text-[#555]">
                  요청과 거절은 알림 상태이며, 승인되어 실제 인수인계가 완료될 때만 현재 해시가 변경됩니다.
                </p>
                {requestHistory.length === 0 ? (
                  <div className="mt-4 rounded-[12px] border border-dashed border-[#D9D9D9] bg-[#fafafa] px-4 py-8 text-center text-[15px] text-[#888]">
                    아직 별도 요청 기록이 없습니다.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {requestHistory.map((row, idx) => {
                      const flow =
                        row.fromUser || row.user
                          ? `${formatPerson(row.fromUser, '현재 담당자')} → ${formatPerson(row.user, '요청자')}`
                          : '—'
                      return (
                        <article
                          key={row.id ?? `request-${idx}`}
                          className="rounded-[12px] border border-[#D9D9D9] bg-[#fafafa] px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold text-black">{actionTitle(row.action)}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              해시 변경 없음
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-[#555]">
                            <span>
                              <span className="text-[#888]">요청 흐름 </span>
                              <span className="font-medium text-black">{flow}</span>
                            </span>
                            <span>
                              <span className="text-[#888]">일시 </span>
                              <span className="font-medium text-black">{row.actionTime ?? '—'}</span>
                            </span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
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
