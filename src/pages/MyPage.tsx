import { useEffect, useState } from 'react'
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
    typeof nested.userId === 'string'
      ? nested.userId
      : typeof nested.userid === 'string'
        ? nested.userid
        : typeof nested.loginId === 'string'
          ? nested.loginId
          : undefined
  const department =
    typeof nested.department === 'string' ? nested.department : ''
  const role = typeof nested.role === 'string' ? nested.role : undefined
  if (!username && !userId && !department) return null
  return { username: username || '—', userId, department, role }
}

export default function MyPage() {
  const [me, setMe] = useState<MeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <AppShell active="mypage">
      <div className="min-h-full px-4 py-8 pb-14 md:px-8" style={{ backgroundColor: figma.pageBg }}>
        <div className="mx-auto max-w-[900px]">
          <header className="mb-8">
            <h1 className={figmaCls.titlePage}>마이페이지</h1>
            <p className={`mt-2 ${figmaCls.subtitle}`}>로그인한 계정의 기본 정보를 확인합니다.</p>
          </header>

          {error ? (
            <p className="mb-6 rounded-[12px] border border-[#f5c6cb] bg-[#fdeaea] px-4 py-3 text-[15px] text-[#721c24]">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-[16px] text-[#666]">불러오는 중…</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <section
                className={`${figmaCls.panel} p-6`}
                style={{ boxShadow: figma.cardShadow }}
              >
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

              <section
                className={`${figmaCls.panel} p-6`}
                style={{ boxShadow: figma.cardShadow }}
              >
                <h2 className="text-[18px] font-semibold text-black">소속</h2>
                <p className="mt-4 text-[20px] font-medium text-[#081C47]">
                  {me?.department ? formatDepartmentLabel(me.department) : '—'}
                </p>
                <p className="mt-4 text-[14px] leading-relaxed text-[#555]">
                  부서 코드가 그대로 표시되면 위 라벨 매핑에 해당 코드를 추가하면 됩니다.
                </p>
              </section>
            </div>
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
