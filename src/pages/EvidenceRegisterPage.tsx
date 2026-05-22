import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

type EvidenceRegisterResponse = {
  message?: string
  initialHash?: string
  currentHash?: string
  qrCodeImage?: string
}

const ITEM_TYPES = ['디지털 파일', '물리 증거', '문서', '영상', '기타'] as const
const ACCEPTED_FILE_EXTENSIONS =
  '.jpg,.jpeg,.png,.gif,.webp,.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.7z,.mp4,.mov,.avi'
const ACCEPTED_FILE_LABEL = '이미지, PDF, 한글/Office 문서, TXT, 압축파일, 영상'
const MAX_FILE_SIZE_MB = 100
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

function toQrImageSrc(qrCodeImage: string): string {
  return qrCodeImage.startsWith('data:')
    ? qrCodeImage
    : `data:image/png;base64,${qrCodeImage}`
}

function safeFileName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|\s]+/g, '_') || 'evidence'
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

export default function EvidenceRegisterPage() {
  const [searchParams] = useSearchParams()
  const initialCaseId = searchParams.get('caseId')

  const [cases, setCases] = useState<CaseRow[]>([])
  const [caseId, setCaseId] = useState<string>(initialCaseId ?? '')
  const [caseQuery, setCaseQuery] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState<string>(ITEM_TYPES[0])
  const [collectedAt, setCollectedAt] = useState('')
  const [collectedPlace, setCollectedPlace] = useState('')
  const [detail, setDetail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loadingCases, setLoadingCases] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [registeredEvidence, setRegisteredEvidence] =
    useState<EvidenceRegisterResponse | null>(null)

  const filteredCases = useMemo(() => {
    const q = caseQuery.trim().toLowerCase()
    if (!q) return cases
    return cases.filter(
      (c) =>
        String(c.id).includes(q) ||
        c.caseName.toLowerCase().includes(q),
    )
  }, [cases, caseQuery])

  const selectedCase = useMemo(
    () => cases.find((c) => String(c.id) === caseId),
    [cases, caseId],
  )

  const qrDownloadFileName = useMemo(() => {
    const casePart = selectedCase
      ? `case-${selectedCase.id}`
      : caseId
        ? `case-${caseId}`
        : 'case'
    const evidencePart =
      itemName.trim() ||
      (registeredEvidence?.initialHash
        ? `evidence-${registeredEvidence.initialHash.slice(0, 8)}`
        : 'evidence')

    return `${safeFileName(`${casePart}-${evidencePart}`)}-qr.png`
  }, [caseId, itemName, registeredEvidence?.initialHash, selectedCase])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await apiFetch('/cases')
        if (!res.ok) throw new Error(await readApiErrorMessage(res))
        const data = (await res.json()) as CaseRow[]
        if (!ignore) setCases(Array.isArray(data) ? data : [])
      } catch {
        if (!ignore) setCases([])
      } finally {
        if (!ignore) setLoadingCases(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setFilePreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setFilePreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const nowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
    [],
  )

  const submit = async () => {
    setMessage(null)
    setQrSrc(null)
    setRegisteredEvidence(null)
    if (!caseId) {
      setMessage('사건을 선택하세요.')
      return
    }
    if (!itemName.trim()) {
      setMessage('증거물명을 입력하세요.')
      return
    }
    if (!file) {
      window.alert('증거물 사진을 업로드해주세요.')
      setMessage('증거물 사진을 업로드해주세요.')
      return
    }
    if (file.size === 0) {
      setMessage('빈 파일은 등록할 수 없습니다.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMessage(`파일 크기는 최대 ${MAX_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`)
      return
    }

    const fileName = file.name.trim()
    const fd = new FormData()
    
    fd.append('caseId', caseId)
    fd.append('itemType', itemType)
    fd.append('fileName', fileName)
    fd.append('itemName', itemName.trim())
    if (detail.trim()) fd.append('description', detail.trim())
    fd.append('file', file, fileName)

    setSubmitting(true)
    try {
      const res = await apiFetch('/evidence', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const data = (await res.json()) as EvidenceRegisterResponse
      setRegisteredEvidence(data)
      const successMessage = data.message ?? '증거물이 등록되었습니다.'
      window.alert(successMessage)
      setMessage(successMessage)
      if (data.qrCodeImage) setQrSrc(toQrImageSrc(data.qrCodeImage))
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : '등록에 실패했습니다.'
      // 가짜 메시지 필터링 제거하고 진짜 메시지 표시
      window.alert(rawMessage)
      setMessage(rawMessage)
    } finally {      setSubmitting(false)
    }
  }

  const downloadQrCode = () => {
    if (!qrSrc) return
    const a = document.createElement('a')
    a.href = qrSrc
    a.download = qrDownloadFileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleFileChange = (nextFile: File | null) => {
    setMessage(null)
    if (!nextFile) {
      setFile(null)
      return
    }
    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setFile(null)
      setMessage(`파일 크기는 최대 ${MAX_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`)
      return
    }
    setFile(nextFile)
  }

  const printQrCode = () => {
    if (!qrSrc) return
    const printWindow = window.open('', '_blank', 'width=640,height=720')
    if (!printWindow) {
      window.alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.')
      return
    }

    const evidenceName = itemName.trim() || '증거물'
    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${evidenceName} QR 코드</title>
          <style>
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, "Noto Sans KR", sans-serif;
              color: #111827;
            }
            .card {
              max-width: 520px;
              margin: 0 auto;
              border: 2px solid #111827;
              border-radius: 16px;
              padding: 28px;
              text-align: center;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 24px;
            }
            p {
              margin: 6px 0;
              font-size: 14px;
            }
            img {
              width: 280px;
              height: 280px;
              margin: 24px auto 16px;
              display: block;
            }
            @media print {
              body { padding: 0; }
              .card { border: 0; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Case Lock 증거물 QR</h1>
            <p><strong>증거물명</strong> ${evidenceName}</p>
            <p><strong>사건 ID</strong> ${caseId || '-'}</p>
            <img src="${qrSrc}" alt="증거물 QR 코드" />
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <AppShell active="evidence">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[1100px]">
        <nav className="mb-8 flex flex-wrap gap-3 text-[14px] text-[#174DC0]">
          <Link to="/home" className="hover:underline">
            홈
          </Link>
          <span className="text-[#d9d9d9]">|</span>
          <Link to="/CaseList" className="hover:underline">
            사건 목록
          </Link>
          <span className="text-[#d9d9d9]">|</span>
          <Link to="/EvidenceList" className="hover:underline">
            증거물 목록
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className={figmaCls.titlePage}>증거물 등록</h1>
          <p className={`mt-2 ${figmaCls.subtitle}`}>사건을 선택한 뒤 증거물 정보와 파일을 등록합니다.</p>
        </header>

        {message ? (
          <p className="mb-4 rounded-[10px] border border-[#d9d9d9] bg-white px-4 py-3 text-[15px] text-[#081c47]">
            {message}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <h2 className="text-[22px] font-semibold text-black">1. 사건 선택</h2>
              <input
                value={caseQuery}
                onChange={(e) => setCaseQuery(e.target.value)}
                className="mt-4 w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[16px] outline-none focus:border-[#081c47]"
                placeholder="사건 ID 또는 사건명으로 검색"
                disabled={loadingCases}
              />
              <div className="mt-4 max-h-[220px] overflow-auto rounded-[10px] border-2 border-[#d9d9d9]">
                {loadingCases ? (
                  <p className="p-4 text-[15px] text-[#666]">사건 목록을 불러오는 중…</p>
                ) : filteredCases.length === 0 ? (
                  <p className="p-4 text-[15px] text-[#666]">표시할 사건이 없습니다.</p>
                ) : (
                  filteredCases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCaseId(String(c.id))}
                      className={`flex w-full flex-col border-b border-[#eee] px-4 py-3 text-left last:border-b-0 hover:bg-[rgba(167,193,255,0.15)] ${
                        String(c.id) === caseId ? 'bg-[rgba(167,193,255,0.29)]' : ''
                      }`}
                    >
                      <span className="text-[13px] font-semibold text-[#174DC0]">
                        #{c.id}
                      </span>
                      <span className="text-[17px] text-black">{c.caseName}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-4 rounded-[10px] bg-[rgba(167,193,255,0.29)] p-4 text-[16px]">
                <span className="font-medium text-black">선택된 사건: </span>
                {selectedCase ? (
                  <span className="text-[#174DC0]">
                    #{selectedCase.id} / {selectedCase.caseName}
                  </span>
                ) : (
                  <span className="text-[#666]">없음</span>
                )}
              </div>
            </section>

            <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <h2 className="text-[22px] font-semibold text-black">2. 증거물 정보 입력</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[17px] font-medium">증거물명</span>
                  <input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[16px] outline-none focus:border-[#081c47]"
                    placeholder="증거물명을 입력해주세요"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[17px] font-medium">증거물 유형</span>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-4 py-3 text-[16px] outline-none focus:border-[#081c47]"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[17px] font-medium">수집일시</span>
                  <input
                    type="datetime-local"
                    value={collectedAt}
                    onChange={(e) => setCollectedAt(e.target.value)}
                    className="w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[16px] outline-none focus:border-[#081c47]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[17px] font-medium">수집 장소</span>
                  <input
                    value={collectedPlace}
                    onChange={(e) => setCollectedPlace(e.target.value)}
                    className="w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[16px] outline-none focus:border-[#081c47]"
                    placeholder="수집 장소"
                  />
                </label>
              </div>
              <label className="mt-6 block">
                <span className="mb-2 block text-[17px] font-medium">증거물 설명</span>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[16px] outline-none focus:border-[#081c47]"
                  placeholder="증거물에 대한 설명"
                />
              </label>
              <div className="mt-6">
                <p className="mb-2 text-[17px] font-medium">증거물 사진 및 파일</p>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-[#d9d9d9] bg-[rgba(167,193,255,0.2)] px-6 py-10 text-center">
                  <input
                    type="file"
                    accept={ACCEPTED_FILE_EXTENSIONS}
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  <span className="text-[15px] text-black">
                    파일을 선택하거나 드래그 영역을 클릭하세요
                  </span>
                  <span className="mt-1 text-[14px] text-[#666]">
                    {file ? file.name : `${ACCEPTED_FILE_LABEL} / 최대 ${MAX_FILE_SIZE_MB}MB`}
                  </span>
                  {file ? (
                    <span className="mt-1 text-[13px] text-[#777]">
                      {file.type || '형식 미확인'} · {formatFileSize(file.size)}
                    </span>
                  ) : null}
                </label>
                {file ? (
                  <div className="mt-4 rounded-[10px] border border-[#d9d9d9] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#252525]">선택 파일 미리보기</p>
                        <p className="mt-1 truncate text-[13px] text-[#666]">{file.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileChange(null)}
                        className="shrink-0 rounded-[8px] border border-[#d9d9d9] px-3 py-1 text-[13px] font-semibold text-[#555]"
                      >
                        삭제
                      </button>
                    </div>
                    {filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="선택한 증거물 미리보기"
                        className="mt-3 max-h-[260px] w-full rounded-[8px] object-contain"
                      />
                    ) : (
                      <div className="mt-3 rounded-[8px] bg-[#f7f7f7] px-4 py-6 text-center text-[14px] text-[#666]">
                        이미지가 아닌 파일은 파일명과 형식만 미리보기로 표시됩니다.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-4 pb-10">
              <Link
                to="/EvidenceList"
                className="inline-flex min-h-[44px] min-w-[120px] items-center justify-center whitespace-nowrap rounded-[15px] border-2 border-[rgba(0,0,0,0.25)] bg-[#d9d9d9] px-4 py-3 text-[15px] font-semibold leading-none text-black sm:min-w-[140px] sm:text-[16px]"
              >
                취소
              </Link>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                className="inline-flex min-h-[48px] min-w-[160px] items-center justify-center whitespace-nowrap rounded-[15px] bg-[#081c47] px-5 py-3 text-[16px] font-semibold leading-none text-white disabled:opacity-60 md:min-w-[180px] md:text-[17px]"
              >
                {submitting ? '등록 중…' : '등록하기'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[20px] font-semibold text-black">자동 생성 정보</h2>
                <span className="rounded-[10px] bg-[rgba(167,193,255,0.29)] px-2 py-1 text-[11px] font-semibold text-[#174DC0]">
                  등록 시
                </span>
              </div>
              <p className="mt-2 text-[14px] text-[#555]">
                증거물 ID·해시·QR은 서버에서 생성됩니다.
              </p>
              <ul className="mt-4 space-y-3 text-[15px]">
                <li className="rounded-[10px] border border-[#d9d9d9] p-3">
                  <span className="text-[#555]">사건 ID</span>
                  <p className="font-semibold text-[#174DC0]">{caseId || '—'}</p>
                </li>
                <li className="rounded-[10px] border border-[#d9d9d9] p-3">
                  <span className="text-[#555]">등록 일시(현재)</span>
                  <p className="font-semibold text-[#174DC0]">{nowLabel}</p>
                </li>
                <li className="rounded-[10px] border border-[#d9d9d9] p-3">
                  <span className="text-[#555]">초기 해시</span>
                  <p className="break-all font-semibold text-[#174DC0]">
                    {registeredEvidence?.initialHash || '등록 후 생성'}
                  </p>
                </li>
                <li className="rounded-[10px] border border-[#d9d9d9] p-3">
                  <span className="text-[#555]">현재 해시</span>
                  <p className="break-all font-semibold text-[#174DC0]">
                    {registeredEvidence?.currentHash || '등록 후 생성'}
                  </p>
                </li>
              </ul>
            </section>

            <section className={`${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
              <h2 className="text-[20px] font-semibold text-black">QR 코드</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#666]">
                등록이 완료되면 서버에서 내려주는 Base64 이미지를 표시합니다.
              </p>
              <div className="mt-4 flex aspect-square max-h-[280px] items-center justify-center rounded-[10px] border-2 border-[#d9d9d9] bg-[#f0f0f0]">
                {qrSrc ? (
                  <img src={qrSrc} alt="증거물 QR" className="max-h-full max-w-full" />
                ) : (
                  <span className="text-[14px] text-[#888]">등록 후 표시</span>
                )}
              </div>
              {qrSrc ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={downloadQrCode}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-[12px] border-2 border-[#081c47] bg-white px-4 text-[14px] font-semibold text-[#081c47] hover:bg-[rgba(167,193,255,0.18)]"
                  >
                    QR 저장
                  </button>
                  <button
                    type="button"
                    onClick={printQrCode}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-[12px] bg-[#081c47] px-4 text-[14px] font-semibold text-white hover:bg-[#0b265f]"
                  >
                    QR 출력
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
