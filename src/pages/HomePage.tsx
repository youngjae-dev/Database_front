import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { apiFetch } from '../lib/api'

type HomePageProps = {
  children?: ReactNode | null
}

type HomeUser = {
  username: string
  department: string
}

type HomeDashboard = {
  user: HomeUser
  caseCount: number | null
  evidenceCount: number | null
  inProgressHandoverCount: number | null
  recentRegisteredCount: number | null
  recentCases: RecentListItem[]
  recentEvidences: RecentListItem[]
}

type RecentListItem = {
  id: string
  name: string
}

const DEFAULT_DASHBOARD: HomeDashboard = {
  user: {
    username: '',
    department: '',
  },
  caseCount: null,
  evidenceCount: null,
  inProgressHandoverCount: null,
  recentRegisteredCount: null,
  recentCases: [],
  recentEvidences: [],
}

const DEPARTMENT_LABELS: Record<string, string> = {
  INVESTIGATOR: '수사관',
  CUSTODIAN: '증거물 보관 담당자',
  ANALYST: '분석관',
  ADMIN: '시스템 관리자',
  LEGAL: '법무 담당자',
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const raw = await res.text()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function fetchApiBody(path: string): Promise<unknown> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`${path} 요청에 실패했습니다.`)
  return readJsonOrText(res)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function parseUser(value: unknown): HomeUser {
  const data = asRecord(value)
  const nested = asRecord(data?.data) ?? data
  return {
    username: typeof nested?.username === 'string' ? nested.username : '',
    department: typeof nested?.department === 'string' ? nested.department : '',
  }
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
  const nested = asRecord(data?.data) ?? data
  const count = nested?.count ?? nested?.total ?? nested?.value
  return parseCount(count)
}

function parseList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  const data = asRecord(value)
  const candidates = [
    data?.data,
    data?.content,
    data?.items,
    data?.list,
    data?.recentCases,
    data?.recentEvidences,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    const nested = asRecord(candidate)
    if (Array.isArray(nested?.content)) return nested.content
    if (Array.isArray(nested?.items)) return nested.items
  }

  return []
}

function getStringField(
  data: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function parseRecentItems(
  value: unknown,
  type: 'case' | 'evidence',
): RecentListItem[] {
  const idKeys =
    type === 'case'
      ? ['caseNumber', 'caseNo', 'caseId', 'id']
      : ['evidenceNumber', 'evidenceNo', 'evidenceId', 'id']
  const nameKeys =
    type === 'case'
      ? ['caseName', 'name', 'title']
      : ['evidenceName', 'name', 'title']

  return parseList(value)
    .slice(0, 10)
    .map((item) => {
      const data = asRecord(item) ?? {}
      return {
        id: getStringField(data, idKeys) || '-',
        name: getStringField(data, nameKeys) || '-',
      }
    })
}

function formatDepartment(department: string): string {
  return DEPARTMENT_LABELS[department] ?? department
}

function formatCount(count: number | null): string {
  return count === null ? '-' : count.toLocaleString('ko-KR')
}

function RecentTableRow({ item }: { item: RecentListItem }) {
  return (
    <tr className="border-b border-[#ececec] last:border-b-0">
      <td className="w-[42%] max-w-0 border-r border-[#ececec] px-3 py-2.5 text-center text-[15px] text-black">
        <span className="block truncate">{item.id}</span>
      </td>
      <td className="max-w-0 px-3 py-2.5 text-center text-[15px] text-black">
        <span className="block truncate">{item.name}</span>
      </td>
    </tr>
  )
}

function StatCard({
  title,
  value,
  unit = '건',
}: {
  title: string
  value: string
  unit?: string
}) {
  return (
    <div className="rounded-[15px] border border-[#e8ecf4] bg-white p-5 shadow-[1px_2px_10px_rgba(0,0,0,0.08)]">
      <p className="text-[15px] text-[#252525]">{title}</p>
      <p className="mt-2 text-[0]">
        <span className="text-[28px] font-semibold text-black">{value}</span>
        <span className="ml-1 text-[16px] font-normal text-black">{unit}</span>
      </p>
    </div>
  )
}

function RecentPanel({
  title,
  subtitle,
  items,
  emptyMessage,
  viewAllTo,
  col1,
  col2,
}: {
  title: string
  subtitle: string
  items: RecentListItem[]
  emptyMessage: string
  viewAllTo: string
  col1: string
  col2: string
}) {
  const rows = items.length ? items : [{ id: '-', name: emptyMessage }]

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[15px] border border-[#d9d9d9] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
        <div>
          <h2 className="text-[22px] font-semibold text-black">{title}</h2>
          <p className="mt-1 text-[15px] text-[#252525]">{subtitle}</p>
        </div>
        <Link
          to={viewAllTo}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[10px] bg-[#081c47] px-4 text-[14px] font-medium text-white hover:bg-[#0a2560]"
        >
          전체 보기
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded-[10px] border border-[#d9d9d9]">
          <table className="w-full table-fixed border-collapse text-center">
            <thead>
              <tr className="bg-[rgba(167,193,255,0.29)] text-[15px] font-medium text-black">
                <th className="border-b border-r border-[#d9d9d9] py-3">{col1}</th>
                <th className="border-b border-[#d9d9d9] py-3">{col2}</th>
              </tr>
            </thead>
            <tbody>{rows.map((item, index) => (
              <RecentTableRow key={`${item.id}-${index}`} item={item} />
            ))}</tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function HomePage({ children = null }: HomePageProps) {
  const [dashboard, setDashboard] = useState<HomeDashboard>(DEFAULT_DASHBOARD)

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      const [
        userResult,
        caseCountResult,
        evidenceCountResult,
        inProgressHandoverResult,
        recentCasesResult,
        recentEvidencesResult,
      ] = await Promise.allSettled([
        fetchApiBody('/auth/me'),
        fetchApiBody('/cases/count'),
        fetchApiBody('/evidence/count'),
        fetchApiBody('/handover/in-progress/count'),
        fetchApiBody('/cases/recent'),
        fetchApiBody('/evidence/recent'),
      ])

      if (ignore) return

      const recentCases =
        recentCasesResult.status === 'fulfilled'
          ? parseRecentItems(recentCasesResult.value, 'case')
          : []
      const recentEvidences =
        recentEvidencesResult.status === 'fulfilled'
          ? parseRecentItems(recentEvidencesResult.value, 'evidence')
          : []
      const hasRecentData =
        recentCasesResult.status === 'fulfilled' ||
        recentEvidencesResult.status === 'fulfilled'

      setDashboard({
        user:
          userResult.status === 'fulfilled'
            ? parseUser(userResult.value)
            : DEFAULT_DASHBOARD.user,
        caseCount:
          caseCountResult.status === 'fulfilled'
            ? parseCount(caseCountResult.value)
            : null,
        evidenceCount:
          evidenceCountResult.status === 'fulfilled'
            ? parseCount(evidenceCountResult.value)
            : null,
        inProgressHandoverCount:
          inProgressHandoverResult.status === 'fulfilled'
            ? parseCount(inProgressHandoverResult.value)
            : null,
        recentRegisteredCount: hasRecentData
          ? recentCases.length + recentEvidences.length
          : null,
        recentCases,
        recentEvidences,
      })
    }

    loadDashboard().catch(() => {
      if (!ignore) setDashboard(DEFAULT_DASHBOARD)
    })

    return () => {
      ignore = true
    }
  }, [])

  const username = dashboard.user.username || '-'
  const department = dashboard.user.department
    ? formatDepartment(dashboard.user.department)
    : '-'
  const caseCount = formatCount(dashboard.caseCount)
  const evidenceCount = formatCount(dashboard.evidenceCount)
  const inProgressHandoverCount = formatCount(
    dashboard.inProgressHandoverCount,
  )
  const recentRegisteredCount = formatCount(dashboard.recentRegisteredCount)

  const headerRight = (
    <div className="flex items-center gap-3 text-right">
      <div>
        <p className="text-[16px] font-semibold text-[#081c47]">{username}</p>
        <p className="text-[13px] text-[#6b7280]">{department}</p>
      </div>
      <div
        className="size-10 shrink-0 rounded-full border border-[#e8ecf4] bg-[rgba(167,193,255,0.35)]"
        aria-hidden
      />
    </div>
  )

  return (
    <AppShell active="home" headerRight={headerRight}>
      <div className="min-h-full bg-[#f5f7fb] p-8 pb-12">
        <div className="mx-auto max-w-[1100px]">
          {children ?? (
            <>
              <header className="mb-8">
                <h1 className="text-[40px] font-semibold leading-tight text-black">홈</h1>
                <p className="mt-2 text-[18px] text-[#252525]">
                  {username} {department}님, 환영합니다.
                </p>
              </header>

              <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="전체 사건" value={caseCount} />
                <StatCard title="전체 증거물" value={evidenceCount} />
                <StatCard title="진행 중 인수인계" value={inProgressHandoverCount} />
                <StatCard title="최근 등록" value={recentRegisteredCount} />
              </div>

              <div className="flex min-h-[420px] flex-col gap-8 lg:flex-row lg:gap-6">
                <RecentPanel
                  title="사건 목록"
                  subtitle="최근 등록된 사건입니다."
                  items={dashboard.recentCases}
                  emptyMessage="최근 등록된 사건이 없습니다."
                  viewAllTo="/CaseList"
                  col1="사건 번호"
                  col2="사건 이름"
                />
                <RecentPanel
                  title="증거물 목록"
                  subtitle="최근 등록된 증거물입니다."
                  items={dashboard.recentEvidences}
                  emptyMessage="최근 등록된 증거물이 없습니다."
                  viewAllTo="/EvidenceList"
                  col1="증거물 번호"
                  col2="증거물 이름"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export { HomePage }
export default HomePage
