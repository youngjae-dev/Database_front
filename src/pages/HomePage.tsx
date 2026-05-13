import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const imgHome = "https://www.figma.com/api/mcp/asset/b5391729-c3e1-417a-a937-c3b79a5938ea";
const img = "https://www.figma.com/api/mcp/asset/e9adff4f-ceab-4440-ab8f-631ba7e95021";
const img2 = "https://www.figma.com/api/mcp/asset/1baf5c53-2279-4317-a2a0-efdce2a52dd7";
const img4 = "https://www.figma.com/api/mcp/asset/c615eab1-a229-40ae-a457-944bb6950dee";
const img6 = "https://www.figma.com/api/mcp/asset/0a5dd388-9ce4-4c81-8c0f-ea0cc16c668b";
const img7 = "https://www.figma.com/api/mcp/asset/b3f7998b-977a-43a4-bfb7-490f37ce037b";
const img9 = "https://www.figma.com/api/mcp/asset/1159c64d-285f-44f2-8d07-573ff19252a2";
const imgCaselock = "https://www.figma.com/api/mcp/asset/fab4e1dd-5baf-41b5-9319-762552304b42";
const img10 = "https://www.figma.com/api/mcp/asset/4ebd82e0-a8e6-4563-8fe2-fdbd1fae7500";
const img11 = "https://www.figma.com/api/mcp/asset/47170441-176b-49df-95ab-f219511c0ee6";
const img1 = "https://www.figma.com/api/mcp/asset/aba02180-4f7f-4e04-bc98-24dfa8da0d60";
const img3 = "https://www.figma.com/api/mcp/asset/d84aafaa-6829-4273-b260-bb230df00e0b";
const img5 = "https://www.figma.com/api/mcp/asset/5b3617a7-65db-4556-b496-ecaf14cc39f0";
const img8 = "https://www.figma.com/api/mcp/asset/adf0ff67-fd60-4ba7-8f59-81aa1b08ad9c";

type HomePageProps = {
  className?: string;
  children?: ReactNode | null;
};

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
    <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]">
      <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]">
        <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center truncate">
          {item.id}
        </p>
      </div>
      <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]">
        <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center truncate px-2">
          {item.name}
        </p>
      </div>
    </div>
  )
}

export function HomePage({ className, children = null }: HomePageProps) {
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
        fetchApiBody('/case/count'),
        fetchApiBody('/evidence/count'),
        fetchApiBody('/handover/in-progress/count'),
        fetchApiBody('/cases/RecentCases'),
        fetchApiBody('/evidence/RecentEvidences'),
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

  return (
    <div className={className || "h-[1024px] relative w-[1440px]"} data-node-id="2:844" data-name="home">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgHome} />
      <div className="absolute bg-[#081c47] inset-[0_75.97%_0_0] overflow-clip" data-node-id="2:845" data-name="메뉴바">
        <Link to="/" className="absolute contents cursor-pointer left-[22px] top-[910px]" data-node-id="2:846" data-name="로그아웃">
          <div className="absolute h-[83px] left-[22px] top-[910px] w-[78px]" data-node-id="2:847" data-name="로그아웃 로고">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img} />
          </div>
          <div className="absolute h-[57px] left-[110px] overflow-clip top-[923px] w-[123px]" data-node-id="2:848" data-name="로그아웃">
            <p className="absolute font-['Pretendard:Medium',sans-serif] h-[48px] leading-[normal] left-[6px] not-italic text-[30px] text-white top-[9px] tracking-[0.6px] w-[194px]" data-node-id="2:849">
              로그아웃
            </p>
          </div>
        </Link>
        <a className="absolute contents cursor-pointer left-[35px] top-[587px]" data-node-id="2:850" data-name="마이페이지">
          <div className="absolute h-[80px] left-[35px] top-[587px] w-[276px]" data-node-id="2:851" data-name="마이페이지">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={img1} />
          </div>
          <div className="absolute h-[43px] left-[54px] top-[603px] w-[37.779px]" data-node-id="2:852" data-name="마이페이지">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img2} />
          </div>
          <p className="absolute font-['Pretendard:Medium',sans-serif] h-[35px] leading-[normal] left-[120px] not-italic text-[30px] text-white top-[609px] w-[169px]" data-node-id="2:853">
            마이페이지
          </p>
        </a>
        <a className="absolute contents cursor-pointer left-[36px] top-[473.5px]" data-node-id="2:854" data-name="인수인계">
          <div className="absolute h-[80px] left-[36px] top-[473.5px] w-[276px]" data-node-id="2:855" data-name="인수인계">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={img3} />
          </div>
          <div className="absolute h-[35px] left-[50px] top-[494px] w-[58px]" data-node-id="2:856" data-name="인수인계">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img4} />
          </div>
          <p className="absolute font-['Pretendard:Medium',sans-serif] h-[35px] leading-[normal] left-[120px] not-italic text-[30px] text-white top-[494px] w-[169px]" data-node-id="2:857">
            인수인계
          </p>
        </a>
        <Link to="/EvidenceList" className="absolute contents cursor-pointer left-[36px] top-[355px]" data-node-id="2:858" data-name="증거물 관리">
          <div className="absolute h-[80px] left-[36px] top-[355px] w-[276px]" data-node-id="2:859" data-name="증거물 관리">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={img5} />
          </div>
          <p className="absolute font-['Pretendard:Medium',sans-serif] h-[35px] leading-[normal] left-[120px] not-italic text-[30px] text-white top-[376px] w-[169px]" data-node-id="2:860">
            증거물 관리
          </p>
          <div className="absolute h-[43px] left-[54px] top-[372px] w-[51px]" data-node-id="2:861" data-name="증거물 관리">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img6} />
          </div>
        </Link>
        <Link to="/CaseList" className="absolute contents cursor-pointer left-[36px] top-[239.5px]">
          <div className="absolute h-[80px] left-[36px] top-[239.5px] w-[276px]"
            data-node-id="2:863" data-name="사건 관리">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={img5} />
          </div>
          <p className="absolute font-['Pretendard:Medium',sans-serif] h-[35px] leading-[normal] left-[120px]
            not-italic text-[30px] text-white top-[262px] w-[169px]" data-node-id="2:864">
          사건 관리
          </p>
          <div className="absolute h-[37px] left-[54px] top-[262px] w-[39px]" data-node-id="2:865" data-name="사건관리 로고">
            <img alt="" className="absolute inset-0 max-w-none object-bottom pointer-events-none size-full" src={img7} />
          </div>
        </Link>
        <Link to="/home" className="absolute contents cursor-pointer left-[36px] top-[130px]" data-node-id="2:866" data-name="홈">
          <div className="absolute h-[80px] left-[36px] top-[130px] w-[276px]" data-node-id="2:867" data-name="홈">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={img8} />
          </div>
          <p className="absolute font-['Pretendard:Medium',sans-serif] h-[35px] leading-[normal] left-[120px] not-italic text-[#081c47] text-[30px] top-[155px] w-[169px]" data-node-id="2:868">
            홈
          </p>
          <div className="absolute aspect-[354/401] left-[15.61%] right-[73.41%] top-[147px]" data-node-id="2:869" data-name="홈 로고">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img9} />
          </div>
        </Link>
        <p className="absolute font-['Pretendard:Regular',sans-serif] h-[27px] leading-[normal] left-[41px] not-italic text-[#d9d9d9] text-[15px] top-[99px] w-[172px]" data-node-id="2:870">
          NAVIGATION
        </p>
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] h-[42px] leading-[0] left-[95px] not-italic text-[0px] text-[rgba(255,255,255,0.1)] top-[24px] w-[187px]" data-node-id="2:871">
          <span className="leading-[normal] text-[35px] text-white">Case</span>
          <span className="leading-[normal] text-[35px]">{` `}</span>
          <span className="leading-[normal] text-[#ff8a00] text-[35px]">Lock</span>
        </p>
        <div className="absolute left-[27px] size-[68px] top-[10px]" data-node-id="2:872" data-name="caselock 로고">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCaselock} />
        </div>
      </div>
      <div className="absolute inset-[0.1%_0_91.11%_25.07%]" data-node-id="2:873" data-name="상단바">
        <div className="absolute bg-white h-[90px] left-0 rounded-[5px] shadow-[0px_2px_3px_0px_rgba(167,193,255,0.29)] top-0 w-[1079px]" data-node-id="2:874" data-name="상단바" />
        <div className="absolute aspect-[503/491] left-[74.14%] right-[20.76%] top-[18px]" data-node-id="2:875" data-name="계정 로고 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[208.55%] left-[-53.88%] max-w-none top-[-51.53%] w-[203.58%]" src={img10} />
          </div>
        </div>
        <p className="absolute font-['Pretendard:ExtraLight',sans-serif] leading-[normal] left-[955px] not-italic text-[15px] text-black top-[45px] whitespace-nowrap" data-node-id="2:876">
          {department}
        </p>
        <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[normal] left-[868px] not-italic text-[30px] text-black top-[29px] whitespace-nowrap" data-node-id="2:877">
          {username}
        </p>
      </div>
      <div className="absolute contents inset-[12.89%_56.25%_78.22%_27.92%] leading-[normal] not-italic whitespace-nowrap" data-node-id="2:878" data-name="제목">
        <p className="absolute font-['Pretendard:Regular',sans-serif] inset-[19.43%_56.25%_78.22%_27.92%] text-[#252525] text-[20px]" data-node-id="2:879">
          {`${username} ${department}님, 환영합니다. `}
        </p>
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] inset-[12.89%_69.03%_81.25%_27.92%] text-[50px] text-black" data-node-id="2:880">
          홈
        </p>
      </div>
      <div className="absolute h-[140px] left-[397px] overflow-clip top-[250px] w-[1011px]" data-node-id="2:881" data-name="Slot">
        {children || (
          <>
            <div className="absolute h-[132px] left-[523px] top-[4px] w-[211px]" data-node-id="2:882">
              <div className="absolute bg-white inset-0 rounded-[15px] shadow-[1px_2px_10px_0px_rgba(0,0,0,0.25)]" data-node-id="2:883" />
              <p className="absolute bottom-1/2 font-['Pretendard:Regular',sans-serif] leading-[normal] left-[32.23%] not-italic right-[-2.37%] text-[20px] text-black top-[29.65%]" data-node-id="2:884">
                진행 중 인수인계
              </p>
              <p className="absolute font-['Pretendard:Medium',sans-serif] inset-[47.09%_10.9%_23.26%_36.97%] leading-[0] not-italic text-[0px] text-black" data-node-id="2:885">
                <span className="leading-[normal] text-[30px]">{`${inProgressHandoverCount} `}</span>
                <span className="font-['Pretendard:Regular',sans-serif] leading-[normal] text-[20px]">건</span>
              </p>
              <div className="absolute aspect-[87/89] left-[6.64%] right-[67.88%] top-[39px]" data-node-id="2:886" data-name="진행 중 인수인계 로고">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-[249.44%] left-[-24.14%] max-w-none top-[-126.97%] w-[255.17%]" src={img11} />
                </div>
              </div>
            </div>
            <div className="absolute h-[132px] left-[782px] top-[4px] w-[211px]" data-node-id="2:887">
              <div className="absolute bg-white inset-0 rounded-[15px] shadow-[1px_2px_10px_0px_rgba(0,0,0,0.25)]" data-node-id="2:888" />
              <p className="absolute bottom-1/2 font-['Pretendard:Regular',sans-serif] leading-[normal] left-[36.02%] not-italic right-[25.12%] text-[20px] text-black top-[29.65%]" data-node-id="2:889">
                최근 등록
              </p>
              <p className="absolute font-['Pretendard:Medium',sans-serif] inset-[47.09%_11.85%_23.26%_36.02%] leading-[0] not-italic text-[0px] text-black" data-node-id="2:890">
                <span className="leading-[normal] text-[30px]">{`${recentRegisteredCount} `}</span>
                <span className="font-['Pretendard:Regular',sans-serif] leading-[normal] text-[20px]">건</span>
              </p>
              <div className="absolute aspect-[53/55] left-[5.21%] right-[69.67%] top-[39px]" data-node-id="2:891" data-name="최근 등록 로고">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-[252.73%] left-[-137.74%] max-w-none top-[-129.09%] w-[262.26%]" src={img11} />
                </div>
              </div>
            </div>
            <div className="absolute h-[132px] left-[264px] top-[4px] w-[211px]" data-node-id="2:892">
              <div className="absolute bg-white inset-0 rounded-[15px] shadow-[1px_2px_10px_0px_rgba(0,0,0,0.25)]" data-node-id="2:893" />
              <p className="absolute bottom-1/2 font-['Pretendard:Regular',sans-serif] leading-[normal] left-[36.49%] not-italic right-[11.37%] text-[20px] text-black top-[29.65%]" data-node-id="2:894">
                전체 증거물
              </p>
              <p className="absolute font-['Pretendard:Medium',sans-serif] inset-[47.09%_11.37%_23.26%_36.49%] leading-[0] not-italic text-[0px] text-black" data-node-id="2:895">
                <span className="leading-[normal] text-[30px]">{`${evidenceCount} `}</span>
                <span className="font-['Pretendard:Regular',sans-serif] leading-[normal] text-[20px]">건</span>
              </p>
              <div className="absolute h-[55px] left-[12px] top-[39px] w-[53.69px]" data-node-id="2:896" data-name="전체 증거물 증거">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-[254.76%] left-[-135.37%] max-w-none top-[-16.67%] w-[260.98%]" src={img11} />
                </div>
              </div>
            </div>
            <div className="absolute h-[132px] left-[5px] top-[4px] w-[211px]" data-node-id="2:897" data-name="전체사건">
              <div className="absolute bg-white inset-0 rounded-[15px] shadow-[1px_2px_10px_0px_rgba(0,0,0,0.25)]" data-node-id="2:898" />
              <p className="absolute bottom-1/2 font-['Pretendard:Regular',sans-serif] leading-[normal] left-[37.91%] not-italic right-[23.22%] text-[20px] text-black top-[29.65%]" data-node-id="2:899">
                전체 사건
              </p>
              <p className="absolute font-['Pretendard:Medium',sans-serif] inset-[47.09%_9.95%_23.26%_37.91%] leading-[0] not-italic text-[0px] text-black" data-node-id="2:900">
                <span className="leading-[normal] text-[30px]">{`${caseCount} `}</span>
                <span className="font-['Pretendard:Regular',sans-serif] leading-[normal] text-[20px]">건</span>
              </p>
              <div className="absolute aspect-[135/140] left-[6.16%] right-[68.7%] top-[39px]" data-node-id="2:901" data-name="전체 사건 로고">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img alt="" className="absolute h-[252.86%] left-[-25.19%] max-w-none top-[-17.14%] w-[262.22%]" src={img11} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="absolute h-[590px] left-[919px] top-[420px] w-[469px]" data-node-id="2:902" data-name="증거물 목록">
        <div className="absolute bg-white border border-[#d9d9d9] border-solid h-[584px] left-0 rounded-[15px] top-[6px] w-[469px]" data-node-id="2:903" />
        <div className="absolute border border-[#d9d9d9] border-solid h-[446px] left-[29px] overflow-clip rounded-[10px] top-[110px] w-[410px]" data-node-id="2:904" data-name="증거물목록 Table">
          <div className="absolute border border-[#d9d9d9] border-solid content-stretch flex flex-col h-[400px] items-start left-[-1px] overflow-clip right-[-1px] top-[44px]" data-node-id="2:905" data-name="RowsContainer">
            <div className="absolute inset-0 z-10 flex flex-col bg-white">
              {(dashboard.recentEvidences.length
                ? dashboard.recentEvidences
                : [{ id: '-', name: '최근 등록된 증거물이 없습니다.' }]
              ).map((item, index) => (
                <RecentTableRow key={`${item.id}-${index}`} item={item} />
              ))}
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:906" data-name="Low 1">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:907" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:908">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:909" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:910">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:911" data-name="Low 2">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:912" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:913">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:914" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:915">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:916" data-name="Low 3">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:917" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:918">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:919" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:920">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:921" data-name="Low 4">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:922" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:923">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:924" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:925">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:926" data-name="Low 5">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:927" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:928">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:929" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:930">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:931" data-name="Low 6">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:932" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:933">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:934" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:935">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:936" data-name="Low 7">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:937" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:938">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:939" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:940">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:941" data-name="Low 8">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:942" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:943">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:944" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:945">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:946" data-name="Low 9">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:947" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:948">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:949" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:950">
                  증거물 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:951" data-name="Low 10">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:952" data-name="증거물 번호">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:953">
                  증거물 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:954" data-name="증거물 이름">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:955">
                  증거물 이름
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bg-[rgba(167,193,255,0.29)] content-stretch flex h-[45px] items-start left-[-1px] pr-[10px] right-[-1px] top-[-1px]" data-node-id="2:956" data-name="TableHeader">
            <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:957" data-name="증거물 번호">
              <p className="font-['Inter:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal h-[24px] leading-[normal] not-italic relative shrink-0 text-[20px] text-black text-center w-[108px]" data-node-id="2:958">
                증거물 번호
              </p>
            </div>
            <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[230px]" data-node-id="2:959" data-name="증거물 이름">
              <p className="font-['Inter:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal h-[24px] leading-[normal] not-italic relative shrink-0 text-[20px] text-black text-center w-[98px]" data-node-id="2:960">
                증거물 이름
              </p>
            </div>
          </div>
        </div>
        <Link to="/EvidenceList" className="absolute bg-[#081c47] block cursor-pointer h-[46px]
          left-[327px] rounded-[10px] top-[31px] w-[108px] flex items-center justify-center">
          <span className="text-white text-[15px] font-medium">
          전체 보기
          </span>
        </Link>
        <p className="absolute font-['Inter:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium h-[35px] leading-[normal] left-[25px] not-italic text-[25px] text-black top-[41px] w-[137px]" data-node-id="2:964">
          증거물 목록
        </p>
        <p className="absolute font-['Pretendard:Regular',sans-serif] inset-[12.37%_48.4%_83.56%_5.33%] leading-[normal] not-italic text-[#252525] text-[20px]" data-node-id="2:965">{`최근 등록된 증거물입니다. `}</p>
      </div>
      <div className="absolute h-[585px] left-[403px] top-[420px] w-[469px]" data-node-id="2:966" data-name="사건목록">
        <div className="absolute bg-white border border-[#d9d9d9] border-solid h-[584px] left-0 rounded-[15px] top-[6px] w-[469px]" data-node-id="2:967" />
        <div className="absolute border border-[#d9d9d9] border-solid h-[445px] left-[29px] overflow-clip rounded-[10px] top-[109px] w-[410px]" data-node-id="2:968" data-name="사건목록 Table">
          <div className="absolute border border-[#d9d9d9] border-solid content-stretch flex flex-col h-[400px] items-start left-[-1px] overflow-clip right-[-1px] top-[44px]" data-node-id="2:969" data-name="RowsContainer">
            <div className="absolute inset-0 z-10 flex flex-col bg-white">
              {(dashboard.recentCases.length
                ? dashboard.recentCases
                : [{ id: '-', name: '최근 등록된 사건이 없습니다.' }]
              ).map((item, index) => (
                <RecentTableRow key={`${item.id}-${index}`} item={item} />
              ))}
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:970" data-name="Low 1">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:971" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:972">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:973" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:974">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:975" data-name="Low 2">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:976" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:977">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:978" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:979">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:980" data-name="Low 3">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:981" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:982">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:983" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:984">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:985" data-name="Low 4">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:986" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:987">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:988" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:989">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:990" data-name="Low 5">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:991" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:992">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:993" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:994">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:995" data-name="Low 6">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:996" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:997">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:998" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:999">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:1000" data-name="Low 7">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:1001" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1002">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:1003" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1004">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:1005" data-name="Low 8">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:1006" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1007">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:1008" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1009">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:1010" data-name="Low 9">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:1011" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1012">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:1013" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1014">
                  사건 이름
                </p>
              </div>
            </div>
            <div className="border-[#d9d9d9] border-b border-solid content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[410px]" data-node-id="2:1015" data-name="Low 10">
              <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:1016" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1017">
                  사건 번호
                </p>
              </div>
              <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip relative shrink-0 w-[230px]" data-node-id="2:1018" data-name="사건 ID">
                <p className="flex-[1_0_0] font-['Inter:Light','Noto_Sans_KR:Regular',sans-serif] font-light leading-[normal] min-w-px not-italic relative text-[15px] text-black text-center" data-node-id="2:1019">
                  사건 이름
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bg-[rgba(167,193,255,0.29)] content-stretch flex h-[45px] items-center left-[-1px] pr-[10px] right-[-1px] top-[-1px]" data-node-id="2:1020" data-name="TableHeader">
            <div className="border-[#d9d9d9] border-r border-solid content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[180px]" data-node-id="2:1021" data-name="사건 ID">
              <p className="font-['Inter:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal h-[24px] leading-[normal] not-italic relative shrink-0 text-[20px] text-black text-center w-[87px]" data-node-id="2:1022">
                사건 번호
              </p>
            </div>
            <div className="content-stretch flex h-[46px] items-center justify-center overflow-clip p-[10px] relative shrink-0 w-[230px]" data-node-id="2:1023" data-name="사건 ID">
              <p className="font-['Inter:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal h-[24px] leading-[normal] not-italic relative shrink-0 text-[20px] text-black text-center w-[80px]" data-node-id="2:1024">
                사건 이름
              </p>
            </div>
          </div>
        </div>
        <a className="absolute contents cursor-pointer left-[327px] top-[31px]" data-node-id="2:1025" data-name="전체보기Button" />
        <a className="absolute bg-[#081c47] block cursor-pointer h-[46px] left-[327px] rounded-[10px] top-[31px] w-[108px]" data-node-id="2:1026" />
        <Link to="/CaseList" className="absolute bg-[#081c47] block cursor-pointer h-[46px] left-[327px] rounded-[10px] top-[31px] w-[108px] flex items-center justify-center">
          <span className="text-white text-[15px] font-medium">
            전체 보기
          </span>
        </Link>
        <p className="absolute font-['Inter:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium h-[35px] leading-[normal] left-[25px] not-italic text-[25px] text-black top-[41px] w-[113px]" data-node-id="2:1028">
          사건 목록
        </p>
        <p className="absolute font-['Pretendard:Regular',sans-serif] inset-[12.48%_50.96%_83.42%_5.33%] leading-[normal] not-italic text-[#252525] text-[20px]" data-node-id="2:1029">{`최근 등록된 사건입니다. `}</p>
      </div>
    </div>
  );
}
