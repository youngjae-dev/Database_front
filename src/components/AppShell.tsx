import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const TOKEN_KEY = 'token'

export type AppNavKey = 'home' | 'cases' | 'evidence' | 'handover' | 'mypage'

type AppShellProps = {
  active: AppNavKey
  children: ReactNode
  /** 오른쪽 상단(기본: Case Lock / 수사관 대신 표시) */
  headerRight?: ReactNode
}

function NavIconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
    </svg>
  )
}

/** Folder + clipboard (사건 관리) */
function NavIconCase({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 9a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinejoin="round" />
      <rect x="8.5" y="11" width="7" height="9" rx="1" strokeWidth="1.5" />
      <path d="M10 11V9.5a1.25 1.25 0 0 1 2.5 0V11" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 14h5M9.5 16.5h3" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M10.5 18.2 12 19.5l2.2-2.8" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Folder + document lines (증거물 관리) */
function NavIconEvidence({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 9a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinejoin="round" />
      <path d="M9 11h10v8a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      <path d="M9 11l2.5-1.5h5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 14.5h6M11 16.5h6M11 18.5h4" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

/** Two people + bidirectional arrows (인수인계) */
function NavIconHandover({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="7" cy="8.5" r="2.25" />
      <path d="M3.5 18.5v-1c0-1.7 1.4-3 3.5-3s3.5 1.3 3.5 3v1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="8.5" r="2.25" />
      <path d="M13.5 18.5v-1c0-1.7 1.4-3 3.5-3s3.5 1.3 3.5 3v1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12h4" strokeLinecap="round" />
      <path d="M10 12 8.5 10.5M10 12 8.5 13.5M14 12l1.5-1.5M14 12l1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavIconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" strokeLinejoin="round" />
      <path d="M5 20v-1c0-2.5 3-4.5 7-4.5s7 2 7 4.5v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavIconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12H9" strokeLinecap="round" />
    </svg>
  )
}

function navItemClass(active: boolean, opts: { disabled?: boolean } = {}) {
  const { disabled } = opts
  return [
    'flex items-center gap-3 rounded-[14px] px-3 py-3.5 text-[16px] font-medium transition-colors',
    active
      ? 'bg-white text-[#081c47] shadow-sm'
      : 'text-white hover:bg-white/10',
    disabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : '',
  ].join(' ')
}

export default function AppShell({ active, children, headerRight }: AppShellProps) {
  const location = useLocation()

  function logout() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-['Pretendard',system-ui,sans-serif] text-[#252525]">
      <aside className="flex w-[280px] shrink-0 flex-col bg-[#081c47] px-3 pb-6 pt-7 text-white">
        <div className="flex items-center gap-3 px-2">
          <img
            src="/caselock-logo.svg"
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full object-cover"
            decoding="async"
          />
          <div className="leading-tight">
            <span className="text-[21px] font-semibold tracking-tight text-white">Case</span>
            <span className="text-[21px] font-semibold tracking-tight text-[#ff8a00]">Lock</span>
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-0.5">
          <Link to="/home" className={navItemClass(active === 'home')}>
            <NavIconHome className="size-6 shrink-0" />
            홈
          </Link>
          <Link to="/CaseList" className={navItemClass(active === 'cases')}>
            <NavIconCase className="size-6 shrink-0" />
            사건 관리
          </Link>
          <Link to="/EvidenceList" className={navItemClass(active === 'evidence')}>
            <NavIconEvidence className="size-6 shrink-0" />
            증거물 관리
          </Link>
          <Link to="/Handover" className={navItemClass(active === 'handover')}>
            <NavIconHandover className="size-6 shrink-0" />
            인수인계
          </Link>
          <Link to="/MyPage" className={navItemClass(active === 'mypage')}>
            <NavIconUser className="size-6 shrink-0" />
            마이페이지
          </Link>
        </nav>

        <div className="flex-1 min-h-4" />

        <div className="mx-2 border-t border-white/15 pt-3">
          <Link
            to="/"
            onClick={logout}
            className="flex items-center gap-3 rounded-[12px] py-3 pl-2 pr-3 text-[16px] font-medium text-white/95 transition-colors hover:bg-white/8"
          >
            <NavIconLogout className="size-6 shrink-0" />
            로그아웃
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e8ecf4] bg-white px-8 shadow-[0_2px_8px_rgba(8,28,71,0.06)]">
          <p className="text-[14px] text-[#6b7280]">
            {location.pathname === '/home' && '홈'}
            {location.pathname === '/CaseList' && '사건 · 목록'}
            {location.pathname === '/EvidenceList' && '증거물 · 목록'}
            {location.pathname === '/CaseRegister' && '사건 · 등록'}
            {location.pathname.startsWith('/CaseDetail') && '사건 · 상세'}
            {location.pathname === '/EvidenceRegister' && '증거물 · 등록'}
            {location.pathname === '/Handover' && '인수인계'}
            {location.pathname === '/MyPage' && '마이페이지'}
          </p>
          {headerRight ?? (
            <div className="text-right text-[14px] text-[#374151]">
              <span className="font-medium text-[#081c47]">Case Lock</span>
              <span className="ml-2 text-[#9ca3af]">수사관</span>
            </div>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
