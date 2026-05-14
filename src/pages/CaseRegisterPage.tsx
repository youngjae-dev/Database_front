import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { figma, figmaCls } from '../design/tokens'
import { apiFetch, readApiErrorMessage } from '../lib/api'

const CASE_TYPES = ['실종', '살인', '절도', '사기', '디지털 증거', '기타'] as const
const CASE_STATUSES = [
  { value: 'OPEN', label: '진행 중' },
  { value: 'CLOSED', label: '종결됨' },
] as const
const DEPARTMENTS = ['형사1과', '형사2과', '사이버수사대', '여성아동과', '기타'] as const

const DRAFT_KEY = 'case-register-draft'

type Me = { username?: string }

function buildDescription(params: {
  overview: string
  location: string
  officer: string
  department: string
  status: string
}): string {
  const parts = [params.overview.trim()]
  if (params.location.trim()) parts.push(`사건 발생 장소: ${params.location.trim()}`)
  if (params.officer.trim()) parts.push(`담당 수사관: ${params.officer.trim()}`)
  if (params.department.trim()) parts.push(`관할 부서: ${params.department.trim()}`)
  if (params.status.trim()) parts.push(`사건 상태(참고): ${params.status.trim()}`)
  return parts.filter(Boolean).join('\n\n')
}

export default function CaseRegisterPage() {
  const navigate = useNavigate()
  const [caseName, setCaseName] = useState('')
  const [caseType, setCaseType] = useState<string>(CASE_TYPES[0])
  const [overview, setOverview] = useState('')
  const [location, setLocation] = useState('')
  const [officer, setOfficer] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState<string>(CASE_STATUSES[0].label)
  const [me, setMe] = useState<Me>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const nowLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
    [],
  )

  useEffect(() => {
    let ignore = false
    apiFetch('/auth/me')
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { data?: Me; username?: string }
        const u = data?.data ?? data
        if (!ignore && u && typeof u === 'object')
          setMe({ username: typeof u.username === 'string' ? u.username : undefined })
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Record<string, string>
      setCaseName(d.caseName ?? '')
      setCaseType(d.caseType ?? CASE_TYPES[0])
      setOverview(d.overview ?? '')
      setLocation(d.location ?? '')
      setOfficer(d.officer ?? '')
      setDepartment(d.department ?? '')
      setStatus(d.status ?? CASE_STATUSES[0].label)
      setMessage('임시 저장된 내용을 불러왔습니다.')
    } catch {
      setMessage('임시 저장본을 읽을 수 없습니다.')
    }
  }

  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        caseName,
        caseType,
        overview,
        location,
        officer,
        department,
        status,
      }),
    )
    setMessage('브라우저에 임시 저장했습니다.')
  }

  const submit = async () => {
    setMessage(null)
    if (!caseName.trim()) {
      setMessage('사건명을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      const description = buildDescription({
        overview,
        location,
        officer,
        department,
        status,
      })
      const res = await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({
          caseName: caseName.trim(),
          description: description || undefined,
          type: caseType,
        }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const createdId = Number(await res.text())
      if (Number.isFinite(createdId))
        navigate(`/CaseDetail/${createdId}`, { replace: true })
      else navigate('/CaseList', { replace: true })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell active="cases">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[970px]">
        <nav className="mb-8 flex flex-wrap gap-3 text-[14px] text-[#174DC0]">
          <Link to="/home" className="hover:underline">
            홈
          </Link>
          <span className="text-[#d9d9d9]">|</span>
          <Link to="/CaseList" className="hover:underline">
            사건 목록
          </Link>
          <span className="text-[#d9d9d9]">|</span>
          <Link to="/EvidenceRegister" className="hover:underline">
            증거물 등록
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className={figmaCls.titlePage}>사건 등록</h1>
          <p className={`mt-2 ${figmaCls.subtitle}`}>사건 정보를 입력하고 등록합니다.</p>
        </header>

        {message ? (
          <p className="mb-4 rounded-[10px] border border-[#d9d9d9] bg-white px-4 py-3 text-[15px] text-[#081c47]">
            {message}
          </p>
        ) : null}

        <section className={`mb-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
          <h2 className="text-[22px] font-semibold text-black">1. 기본 정보</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[18px] font-medium">사건명</span>
              <input
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                className="w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
                placeholder="사건명을 입력하세요"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[18px] font-medium">사건 유형</span>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
              >
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-6 block">
            <span className="mb-2 block text-[18px] font-medium">사건 개요 / 설명</span>
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
              placeholder="사건 개요 또는 설명을 입력하세요"
            />
          </label>
          <label className="mt-6 block">
            <span className="mb-2 block text-[18px] font-medium">사건 발생 장소</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
              placeholder="발생 장소를 입력하세요"
            />
          </label>
        </section>

        <section className={`mb-6 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
          <h2 className="text-[22px] font-semibold text-black">2. 담당 정보</h2>
          <p className="mt-1 text-[14px] text-[#666]">
            아래 항목은 설명(description) 필드에 함께 저장됩니다.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-[18px] font-medium">담당 수사관</span>
              <input
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                className="w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
                placeholder="이름을 입력하세요"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[18px] font-medium">관할 부서</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
              >
                <option value="">선택</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[18px] font-medium">사건 상태(참고)</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-4 py-3 text-[17px] outline-none focus:border-[#081c47]"
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s.value} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className={`mb-8 ${figmaCls.panel} p-6`} style={{ boxShadow: figma.cardShadow }}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-semibold text-black">자동 생성 정보</h2>
            <span className="rounded-[10px] bg-[rgba(167,193,255,0.29)] px-3 py-1 text-[12px] font-semibold text-[#174DC0]">
              등록 시 확정
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[10px] border-2 border-[#d9d9d9] p-4">
              <p className="text-[15px] text-black">사건 ID</p>
              <p className="mt-2 text-[18px] font-semibold text-[#174DC0]">등록 후 부여</p>
            </div>
            <div className="rounded-[10px] border-2 border-[#d9d9d9] p-4">
              <p className="text-[15px] text-black">등록일시</p>
              <p className="mt-2 text-[18px] font-semibold text-[#174DC0]">{nowLabel}</p>
            </div>
            <div className="rounded-[10px] border-2 border-[#d9d9d9] p-4">
              <p className="text-[15px] text-black">등록자 ID</p>
              <p className="mt-2 text-[18px] font-semibold text-[#174DC0]">
                {me.username ?? '—'}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-[44px] min-w-[120px] items-center justify-center whitespace-nowrap rounded-[15px] border-2 border-[rgba(0,0,0,0.25)] bg-[#d9d9d9] px-4 py-3 text-[15px] font-semibold leading-none text-black sm:min-w-[140px] sm:text-[16px]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex min-h-[44px] min-w-[120px] items-center justify-center whitespace-nowrap rounded-[15px] border-2 border-[rgba(0,0,0,0.25)] bg-[rgba(167,193,255,0.29)] px-4 py-3 text-[15px] font-semibold leading-none text-[#081c47] sm:min-w-[140px] sm:text-[16px]"
          >
            임시 저장
          </button>
          <button
            type="button"
            onClick={loadDraft}
            className="inline-flex min-h-[44px] min-w-[200px] items-center justify-center whitespace-nowrap rounded-[15px] border-2 border-[#d9d9d9] bg-white px-4 py-3 text-[14px] font-medium leading-none text-[#081c47] sm:min-w-[220px] sm:text-[15px]"
          >
            임시 저장 불러오기
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex min-h-[48px] min-w-[160px] items-center justify-center whitespace-nowrap rounded-[15px] bg-[#081c47] px-5 py-3 text-[16px] font-semibold leading-none text-white disabled:opacity-60 md:min-w-[180px] md:text-[17px]"
          >
            {saving ? '등록 중…' : '등록하기'}
          </button>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
