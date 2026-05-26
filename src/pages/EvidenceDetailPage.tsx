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
  return action ? '기록' : '—'
}

function isHashChainAction(action: string | undefined): boolean {
  return action === 'INITIAL_REGISTRATION' || action === 'TRANSFER'
}

export default function EvidenceDetailPage() {
  const { evidenceId } = useParams<{ evidenceId: string }>()
  const [row, setRow] = useState<EvidenceSummary | null>(null)
  const [logs, setLogs] = useState<CustodyLogRow[]>([])
  const [loading, setLoading] = useState(Boolean(evidenceId))
  const [error, setError] = useState<string | null>(null)
  const [checkingHashChain, setCheckingHashChain] = useState(false)

  const [verifyingIndex, setVerifyingIndex] = useState<number>(-1)
  const [verifiedIndexes, setVerifiedIndexes] = useState<number[]>([])
  const [failedIndex, setFailedIndex] = useState<number>(-1)

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
  const hashChainLogs = useMemo(
    () => logs.filter((log) => isHashChainAction(log.action)),
    [logs],
  )
  const requestLogs = useMemo(
    () => logs.filter((log) => !isHashChainAction(log.action)),
    [logs],
  )

  const checkHashChain = async () => {
    if (!evidenceId) {
      window.alert('잘못된 증거물 ID입니다.')
      return
    }

    setCheckingHashChain(true)
    try {
      // 1. 백엔드 통합 무결성 검증 (실물 파일 + 장부 재계산 검증)
      const verifyRes = await apiFetch(`/evidence/${evidenceId}/verify`, { method: 'POST' })
      if (!verifyRes.ok) throw new Error(await readApiErrorMessage(verifyRes))
      
      const verifyData = asRecord(await verifyRes.json())
      const isTotallyIntact = !!verifyData?.verified
      const verificationMessage = toText(verifyData?.message)

      // 2. 히스토리 목록 갱신 (화면 표시용)
      const historyRes = await apiFetch(`/evidence/${evidenceId}/history`)
      let latestLogs = logs
      if (historyRes.ok) {
        latestLogs = parseCustodyLogs((await historyRes.json()) as unknown)
        setLogs(latestLogs)
      }
      
      const chainOnlyLogs = latestLogs.filter((log) => isHashChainAction(log.action))

      // 조작된 로그 ID 추출 (백엔드 에러 메시지 분석)
      let failedLogId = -1
      const logIdMatch = verificationMessage.match(/\[LOG_ID:(\d+)\]/)
      if (logIdMatch) {
          failedLogId = parseInt(logIdMatch[1], 10)
      } else if (!isTotallyIntact) {
          failedLogId = chainOnlyLogs[chainOnlyLogs.length - 1]?.id ? parseInt(chainOnlyLogs[chainOnlyLogs.length - 1].id!, 10) : -1
      }

      // --- 애니메이션 시작 ---
      setVerifiedIndexes([])
      setFailedIndex(-1)
      
      for (let i = 0; i < chainOnlyLogs.length; i++) {
         setVerifyingIndex(i)
         
         // 한 줄 검사할 때마다 0.6초씩 대기 (극적인 효과)
         await new Promise(r => setTimeout(r, 600))
         
         const currentLogId = chainOnlyLogs[i].id ? parseInt(chainOnlyLogs[i].id!, 10) : -1
         
         if (!isTotallyIntact && currentLogId === failedLogId) {
             // 조작 적발! (빨간색)
             setFailedIndex(i)
             setVerifyingIndex(-1)
             break
         }
         // 정상 통과 (초록색)
         setVerifiedIndexes(prev => [...prev, i])
      }

      if (isTotallyIntact) {
         setVerifyingIndex(-1)
      }

      // 애니메이션이 끝난 후 0.3초 뒤에 팝업 띄우기
      setTimeout(() => {
        const finalReport = [
          '무결성 정밀 검증 결과',
          '--------------------------------',
          `상태: ${verificationMessage}`,
          '--------------------------------',
          isTotallyIntact 
            ? '최종 결론: 이 증거물은 안전합니다.' 
            : '최종 결론: 보안 위협이 감지되었습니다!'
        ].join('\n')
        
        window.alert(finalReport)
        setCheckingHashChain(false)
      }, 300)

    } catch (e) {
      window.alert(e instanceof Error ? e.message : '무결성 검증에 실패했습니다.')
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
                  <div>
                    <h2 className="text-[22px] font-semibold text-black">해시체인 이력</h2>
                    <p className="mt-1 text-[14px] text-[#555]">
                      실제 현재 해시가 변경되는 최초 등록과 인수인계 완료 기록만 표시합니다.
                    </p>
                  </div>
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
                  {hashChainLogs.length === 0 ? (
                    <div className="py-8 text-center text-[15px] text-[#888]">표시할 해시체인 이력이 없습니다.</div>
                  ) : (
                    hashChainLogs.map((log, index) => {
                      let rowClass = "grid border-t border-[#d9d9d9] text-[14px] lg:grid-cols-[160px_120px_110px_110px_1fr_1fr] lg:items-center lg:text-center transition-colors duration-300"
                      
                      if (failedIndex === index) {
                        rowClass += " bg-[#fee2e2] text-[#991b1b] font-bold" // 조작 발견
                      } else if (verifiedIndexes.includes(index)) {
                        rowClass += " bg-[#dcfce3] text-[#166534]" // 정상 통과
                      } else if (verifyingIndex === index) {
                        rowClass += " bg-[#fef08a] animate-pulse" // 현재 검사 중
                      }

                      return (
                        <div
                          key={log.id || `${log.actionTime}-${index}`}
                          className={rowClass}
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
                      )
                    })
                  )}
                </div>
              </section>

              <section className={`mt-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
                <h2 className="text-[22px] font-semibold text-black">인수인계 요청 기록</h2>
                <p className="mt-1 text-[14px] text-[#555]">
                  요청과 거절은 알림 상태 기록이며, 이 기록만으로는 현재 해시가 변경되지 않습니다.
                </p>
                <div className="mt-4 overflow-hidden rounded-[10px] border border-[#d9d9d9]">
                  <div className="grid grid-cols-1 bg-[#fafafa] text-center text-[15px] font-medium text-[#555] lg:grid-cols-[160px_130px_1fr_1fr]">
                    <div className="border-r border-[#d9d9d9] py-3">요청일시</div>
                    <div className="border-r border-[#d9d9d9] py-3">상태</div>
                    <div className="border-r border-[#d9d9d9] py-3">요청 흐름</div>
                    <div className="py-3">기준 해시</div>
                  </div>
                  {requestLogs.length === 0 ? (
                    <div className="py-8 text-center text-[15px] text-[#888]">표시할 요청 기록이 없습니다.</div>
                  ) : (
                    requestLogs.map((log, index) => (
                      <div
                        key={log.id || `request-${log.actionTime}-${index}`}
                        className="grid border-t border-[#d9d9d9] text-[14px] lg:grid-cols-[160px_130px_1fr_1fr] lg:items-center lg:text-center"
                      >
                        <div className="border-[#d9d9d9] p-3 lg:border-r">
                          {formatEvidenceDate(log.actionTime)}
                        </div>
                        <div className="border-[#d9d9d9] p-3 font-medium lg:border-r">
                          {actionLabel(log.action)}
                        </div>
                        <div className="border-[#d9d9d9] p-3 lg:border-r">
                          {log.fromUsername || '—'} → {log.toUsername || '—'}
                        </div>
                        <div className="break-all p-3 text-left text-[13px] text-[#555]">
                          {log.previousHash || '—'}
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
