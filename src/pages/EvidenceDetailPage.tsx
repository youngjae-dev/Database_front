import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'
import {
  asRecord,
  formatEvidenceDate,
  parseEvidenceNameType,
  parseEvidenceRow,
  type EvidenceSummary,
} from '../lib/evidenceDisplay'

type CustodyLogRow = {
  id?: string
  action?: string
  previousHash?: string
  currentHash?: string
  actionTime?: string
  fromUsername?: string
  toUsername?: string
}

function toText(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string'
    ? String(value)
    : ''
}

function parseCustodyLog(item: unknown): CustodyLogRow {
  const o = asRecord(item) ?? {}
  const user = asRecord(o.user)
  const fromUser = asRecord(o.fromUser) ?? asRecord(o.from_user)
  const toUser = asRecord(o.toUser) ?? asRecord(o.to_user)
  return {
    id: toText(o.id),
    action: toText(o.action),
    previousHash: toText(o.previousHash) || toText(o.previous_hash),
    currentHash: toText(o.currentHash) || toText(o.current_hash),
    actionTime: toText(o.actionTime) || toText(o.action_time),
    fromUsername:
      toText(o.fromUsername) ||
      toText(o.from_username) ||
      toText(fromUser?.username) ||
      toText(fromUser?.userId) ||
      toText(fromUser?.id),
    toUsername:
      toText(o.toUsername) ||
      toText(o.to_username) ||
      toText(toUser?.username) ||
      toText(toUser?.userId) ||
      toText(toUser?.id) ||
      toText(o.username) ||
      toText(user?.username) ||
      toText(user?.userId) ||
      toText(user?.id),
  }
}

function parseCustodyLogs(raw: unknown): CustodyLogRow[] {
  if (Array.isArray(raw)) return raw.map(parseCustodyLog)
  const data = asRecord(raw)
  const inner = data?.data ?? data?.content ?? data?.items
  return Array.isArray(inner) ? inner.map(parseCustodyLog) : []
}

function actionLabel(action: string | undefined): string {
  if (action === 'INITIAL_REGISTRATION') return '최초 등록'
  if (action === 'TRANSFER') return '인수인계'
  if (action === 'TRANSFER_REQUESTED') return '인수 요청'
  if (action === 'TRANSFER_APPROVED') return '요청 승인'
  if (action === 'TRANSFER_REJECTED') return '요청 거절'
  return action || '—'
}

function compareHash(a: string | undefined, b: string | undefined): boolean {
  return (a ?? '').trim() === (b ?? '').trim()
}

function formatLogPoint(log: CustodyLogRow, index: number): string {
  const label = actionLabel(log.action)
  const time = formatEvidenceDate(log.actionTime)
  return `${index + 1}번째 기록(${label}, ${time})`
}

function buildHashChainResult(logs: CustodyLogRow[]): string {
  const chainLogs = logs.filter(
    (log) => log.action === 'INITIAL_REGISTRATION' || log.action === 'TRANSFER',
  )
  if (chainLogs.length === 0) {
    return '해시체인 확인 결과\n\n검사할 인수인계 이력이 없습니다.'
  }

  const orderedLogs = chainLogs
    .map((log, index) => ({ log, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.log.actionTime ?? '')
      const bTime = Date.parse(b.log.actionTime ?? '')
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return a.index - b.index
      return aTime - bTime
    })
    .map((item) => item.log)

  const issues: string[] = []
  const first = orderedLogs[0]
  if (first.action !== 'INITIAL_REGISTRATION') {
    issues.push('최초 등록 기록이 없어 체인의 시작점을 확인할 수 없습니다.')
  }

  orderedLogs.forEach((log, index) => {
    if (!log.currentHash?.trim()) {
      issues.push(`${formatLogPoint(log, index)}의 현재 해시가 비어 있습니다.`)
    }
  })

  for (let i = 1; i < orderedLogs.length; i += 1) {
    const previous = orderedLogs[i - 1]
    const current = orderedLogs[i]
    if (!current.previousHash?.trim()) {
      issues.push(`${formatLogPoint(current, i)}의 이전 해시가 비어 있습니다.`)
      continue
    }
    if (!compareHash(previous.currentHash, current.previousHash)) {
      issues.push(
        [
          `${formatLogPoint(current, i)}에서 해시 연결이 끊겼습니다.`,
          `예상 이전 해시: ${previous.currentHash || '없음'}`,
          `기록된 이전 해시: ${current.previousHash || '없음'}`,
        ].join('\n'),
      )
    }
  }

  if (issues.length === 0) {
    return [
      '해시체인 확인 결과',
      '',
      `총 ${orderedLogs.length}개 기록을 검사했습니다.`,
      '이전 해시와 직전 현재 해시가 모두 일치합니다.',
      '강제로 수정된 흔적이 발견되지 않았습니다.',
    ].join('\n')
  }

  return [
    '해시체인 확인 결과',
    '',
    `총 ${orderedLogs.length}개 기록 중 ${issues.length}개 이상 항목에서 이상이 발견되었습니다.`,
    '강제로 수정되었거나 이력 데이터가 누락되었을 가능성이 있습니다.',
    '',
    ...issues,
  ].join('\n')
}

export default function EvidenceDetailPage() {
  const { evidenceId } = useParams<{ evidenceId: string }>()
  const [row, setRow] = useState<EvidenceSummary | null>(null)
  const [logs, setLogs] = useState<CustodyLogRow[]>([])
  const [loading, setLoading] = useState(Boolean(evidenceId))
  const [error, setError] = useState<string | null>(null)
  const [checkingHashChain, setCheckingHashChain] = useState(false)

  const display = useMemo(
    () => parseEvidenceNameType(row ?? {}),
    [row],
  )

  useEffect(() => {
    if (!evidenceId) return

    let ignore = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [detailRes, historyRes] = await Promise.all([
          apiFetch(`/evidence/${evidenceId}`),
          apiFetch(`/evidence/${evidenceId}/history`),
        ])

        if (!detailRes.ok) throw new Error(await readApiErrorMessage(detailRes))
        if (!historyRes.ok) throw new Error(await readApiErrorMessage(historyRes))

        const found = parseEvidenceRow((await detailRes.json()) as unknown)
        const history = parseCustodyLogs((await historyRes.json()) as unknown)

        if (!ignore) {
          setRow(found)
          setLogs(history)
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
  }, [evidenceId])

  const visibleError = !evidenceId ? '잘못된 증거물 ID입니다.' : error

  const checkHashChain = async () => {
    if (!evidenceId) {
      window.alert('잘못된 증거물 ID입니다.')
      return
    }

    setCheckingHashChain(true)
    try {
      const res = await apiFetch(`/evidence/${evidenceId}/history`)
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const latestLogs = parseCustodyLogs((await res.json()) as unknown)
      setLogs(latestLogs)
      window.alert(buildHashChainResult(latestLogs))
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '해시체인 확인에 실패했습니다.')
    } finally {
      setCheckingHashChain(false)
    }
  }

  return (
    <AppShell active="evidence">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1000px]">
          <nav className="mb-8 flex flex-wrap gap-3 text-[14px] text-[#174DC0]">
            <Link to="/home" className="hover:underline">
              홈
            </Link>
            <span className="text-[#d9d9d9]">|</span>
            <Link to="/EvidenceList" className="hover:underline">
              증거물 목록
            </Link>
            <span className="text-[#d9d9d9]">|</span>
            <Link to="/EvidenceRegister" className="hover:underline">
              증거물 등록
            </Link>
          </nav>

          <header className="mb-8">
            <h1 className={figmaCls.titlePage}>증거물 상세 정보</h1>
            <p className={`mt-2 ${figmaCls.subtitle}`}>선택한 증거물의 등록 정보와 이력을 확인합니다.</p>
          </header>

          {loading ? (
            <p className="text-[16px] text-[#666]">불러오는 중…</p>
          ) : visibleError ? (
            <p className="rounded-[10px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
              {visibleError}
            </p>
          ) : row ? (
            <>
              <section className={`mb-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
                <h2 className="text-[22px] font-semibold text-black">기본정보</h2>
                <div className="mt-6 grid gap-0 overflow-hidden rounded-[10px] border border-[#d9d9d9] md:grid-cols-2">
                  {[
                    ['증거물 번호', row.evidenceId || evidenceId || '—'],
                    ['증거물명', display.name],
                    ['유형', display.type],
                    ['참조 사건', row.caseName ? `${row.caseName} (#${row.caseId || '—'})` : row.caseId ? `#${row.caseId}` : '—'],
                    ['등록일시', formatEvidenceDate(row.createdAt)],
                    ['담당자', row.handler || '—'],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex border-b border-[#d9d9d9] md:border-r md:last:border-r-0 [&:nth-child(2n)]:md:border-r-0"
                    >
                      <div className="w-[140px] shrink-0 bg-[rgba(167,193,255,0.29)] px-4 py-4 text-[16px] font-medium text-[#081c47]">
                        {k}
                      </div>
                      <div className="flex flex-1 items-center break-all px-4 py-4 text-[16px] text-[#081c47]">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`mb-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
                <h2 className="text-[22px] font-semibold text-black">증거물 설명</h2>
                <div className="mt-4 min-h-[120px] whitespace-pre-wrap rounded-[10px] border border-[#d9d9d9] bg-[#fafafa] p-4 text-[17px] leading-relaxed text-black">
                  {row.description?.trim() ? row.description : '등록된 설명이 없습니다.'}
                </div>
              </section>

              <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[22px] font-semibold text-black">인수인계 이력</h2>
                  <button
                    type="button"
                    disabled={checkingHashChain}
                    onClick={() => void checkHashChain()}
                    className={`inline-flex min-h-[44px] items-center justify-center whitespace-nowrap px-5 ${figmaCls.btnPrimary} disabled:opacity-50`}
                  >
                    {checkingHashChain ? '확인 중…' : '해시체인 확인'}
                  </button>
                </div>
                <div className="mt-4 overflow-hidden rounded-[10px] border border-[#d9d9d9]">
                  <div className="grid grid-cols-1 bg-[rgba(167,193,255,0.29)] text-center text-[15px] font-medium text-[#081c47] lg:grid-cols-[160px_120px_110px_110px_1fr_1fr]">
                    <div className="border-r border-[#d9d9d9] py-3">처리일시</div>
                    <div className="border-r border-[#d9d9d9] py-3">처리 유형</div>
                    <div className="border-r border-[#d9d9d9] py-3">인계자</div>
                    <div className="border-r border-[#d9d9d9] py-3">인수자</div>
                    <div className="border-r border-[#d9d9d9] py-3">이전 해시</div>
                    <div className="py-3">현재 해시</div>
                  </div>
                  {logs.length === 0 ? (
                    <div className="py-8 text-center text-[15px] text-[#888]">표시할 이력이 없습니다.</div>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={log.id || `${log.actionTime}-${index}`}
                        className="grid border-t border-[#d9d9d9] text-[14px] lg:grid-cols-[160px_120px_110px_110px_1fr_1fr] lg:items-center lg:text-center"
                      >
                        <div className="border-[#d9d9d9] p-3 lg:border-r">
                          {formatEvidenceDate(log.actionTime)}
                        </div>
                        <div className="border-[#d9d9d9] p-3 lg:border-r">
                          {actionLabel(log.action)}
                        </div>
                        <div className="border-[#d9d9d9] p-3 lg:border-r">
                          {log.fromUsername || (log.action === 'INITIAL_REGISTRATION' ? '시스템' : '—')}
                        </div>
                        <div className="border-[#d9d9d9] p-3 lg:border-r">
                          {log.toUsername || '—'}
                        </div>
                        <div className="break-all border-[#d9d9d9] p-3 text-left text-[13px] text-[#555] lg:border-r">
                          {log.previousHash || '—'}
                        </div>
                        <div className="break-all p-3 text-left text-[13px] text-[#555]">
                          {log.currentHash || '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}
