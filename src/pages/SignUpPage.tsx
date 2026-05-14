import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, parseApiErrorBody } from '../lib/api'
import type { UserSignUpRequest } from '../types/auth'

const imgBg =
  'https://www.figma.com/api/mcp/asset/40087fa6-cf47-4b37-8d7e-d65f553e5a18'
const imgLogo =
  'https://www.figma.com/api/mcp/asset/5f717098-c863-4098-8dbb-53d6326d94e3'
const imgChevron =
  'https://www.figma.com/api/mcp/asset/3bd0dd03-cec2-41d1-b099-13bf1a1692a6'

const RANK_OPTIONS = ['경위', '경감', '경사', '경장', '순경'] as const

const DEPARTMENT_OPTIONS = [
  { label: '수사관', value: 'INVESTIGATOR' },
  { label: '증거물 보관 담당자', value: 'CUSTODIAN' },
  { label: '분석관', value: 'ANALYST' },
  { label: '시스템 관리자', value: 'ADMIN' },
  { label: '법무 담당자', value: 'LEGAL' },
]

function FieldDivider() {
  return (
    <div
      className="h-px w-full shrink-0 bg-[#d9d9d9]"
      aria-hidden
    />
  )
}

function SignUpPage() {
  const navigate = useNavigate()
  const [officerId, setOfficerId] = useState('')
  const [realName, setRealName] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const body: UserSignUpRequest = {
      userId: officerId.trim(),
      username: realName.trim(), // 백엔드 username 필드에 실명 저장
      password,
      role: role,
      department: department,
    }

    try {
      const res = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const raw = await res.text()
      if (!res.ok) {
        throw new Error(parseApiErrorBody(raw, res.statusText))
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full" data-name="회원가입">
      <img
        alt=""
        className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
        src={imgBg}
      />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col items-center px-4 pb-12 pt-7">
        <div className="relative aspect-square w-[clamp(160px,14vw,208px)] shrink-0">
          <img
            alt="Case Lock"
            className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
            src={imgLogo}
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative z-10 mt-8 w-full max-w-[618px] rounded-[15.2px] border-2 border-[#d9d9d9] bg-white px-6 py-7 shadow-lg shadow-black/5 md:px-8 md:py-8"
        >
          {error ? (
            <p
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-[16px] text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <h2 className="font-['Inter','Noto_Sans_KR',sans-serif] text-[30px] font-semibold text-black">
            회원가입
          </h2>
          <p className="font-['Pretendard:Regular',sans-serif] mt-3 text-[20px] text-[#252525]">
            담당자 정보를 입력하여 회원가입을 진행해 주세요.
          </p>
          <div className="my-5">
            <FieldDivider />
          </div>

          <label
            className="block font-['Pretendard:Medium',sans-serif] text-[20px] text-[#252525]"
            htmlFor="signup-userid"
          >
            Officer ID
          </label>
          <input
            id="signup-userid"
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            placeholder="사용하실 ID를 입력하세요"
            className="relative z-10 mt-2 h-[41px] w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-3 font-['Pretendard:Light',sans-serif] text-[15px] text-[#252525] outline-none placeholder:text-[rgba(37,37,37,0.55)] focus:border-[#081c47]"
          />

          <label
            className="font-['Pretendard:Medium',sans-serif] mt-6 block text-[20px] text-[#252525]"
            htmlFor="signup-username"
          >
            이름 (실명)
          </label>
          <input
            id="signup-username"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="본인의 실명을 입력하세요"
            className="relative z-10 mt-2 h-[41px] w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-3 font-['Pretendard:Light',sans-serif] text-[15px] text-[#252525] outline-none placeholder:text-[rgba(37,37,37,0.55)] focus:border-[#081c47]"
          />

          <label
            className="font-['Pretendard:Medium',sans-serif] mt-6 block text-[20px] text-[#252525]"
            htmlFor="signup-dept"
          >
            소속 부서
          </label>
          <div className="relative z-10 mt-2">
            <select
              id="signup-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-[41px] w-full appearance-none rounded-[10px] border-2 border-[#d9d9d9] bg-white px-3 pr-10 font-['Pretendard:Light',sans-serif] text-[15px] text-[#252525] outline-none focus:border-[#081c47]"
            >
              <option value="">부서를 선택하세요</option>
              {DEPARTMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <img
              alt=""
              src={imgChevron}
              className="pointer-events-none absolute right-3 top-1/2 z-20 size-[31px] -translate-y-1/2"
            />
          </div>

          <label
            className="font-['Pretendard:Medium',sans-serif] mt-6 block text-[20px] text-[#252525]"
            htmlFor="signup-role"
          >
            직급
          </label>
          <div className="relative z-10 mt-2">
            <select
              id="signup-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-[41px] w-full appearance-none rounded-[10px] border-2 border-[#d9d9d9] bg-white px-3 pr-10 font-['Pretendard:Light',sans-serif] text-[15px] text-[#252525] outline-none focus:border-[#081c47]"
            >
              <option value="">직급을 선택하세요</option>
              {RANK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <img
              alt=""
              src={imgChevron}
              className="pointer-events-none absolute right-3 top-1/2 z-20 size-[31px] -translate-y-1/2"
            />
          </div>

          <label
            className="font-['Pretendard:Medium',sans-serif] mt-6 block text-[20px] text-[#252525]"
            htmlFor="signup-password"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="relative z-10 mt-2 h-[41px] w-full rounded-[10px] border-2 border-[#d9d9d9] bg-white px-3 font-['Pretendard:Light',sans-serif] text-[15px] text-[#252525] outline-none placeholder:text-[rgba(37,37,37,0.55)] focus:border-[#081c47]"
          />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="flex h-[44px] flex-1 items-center justify-center rounded-[10px] border-2 border-[rgba(0,0,0,0.25)] bg-transparent font-['Pretendard:Regular',sans-serif] text-[20px] text-black"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="h-[44px] flex-1 rounded-[10px] border-2 border-[#081c47] bg-[#081c47] font-['Pretendard:Regular',sans-serif] text-[20px] text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '처리 중…' : '회원가입'}
            </button>
          </div>
        </form>

        <p className="font-['Pretendard:ExtraLight',sans-serif] mt-10 max-w-[640px] text-center text-[22px] text-black">
          승인된 접근만 허용됩니다. 모든 활동은 해시체인 암호화로 기록됩니다.
        </p>
      </div>
    </div>
  )
}

export { SignUpPage }
export default SignUpPage
