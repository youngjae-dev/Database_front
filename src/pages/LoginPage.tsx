import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, parseApiErrorBody } from '../lib/api'
import type { LoginRequest } from '../types/auth'

const TOKEN_KEY = 'token'
const REMEMBER_ID_KEY = 'rememberedUsername'

const imgLogIn =
  'https://www.figma.com/api/mcp/asset/7a187763-ffb3-4e32-b68a-50046d228e7e'
const imgLogo =
  'https://www.figma.com/api/mcp/asset/37380eb0-cae6-43f4-82c6-5b2f2b3d94a8'
const imgButtonBg =
  'https://www.figma.com/api/mcp/asset/39cbac89-63c2-43a5-bcaf-a82c4d728027'

export function LoginPage() {
  const navigate = useNavigate()
  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_ID_KEY)
    if (saved) {
      setOfficerId(saved)
      setRemember(true)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const body: LoginRequest = {
      username: officerId.trim(),
      password,
    }

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const raw = await res.text()
      if (!res.ok) {
        throw new Error(parseApiErrorBody(raw, res.statusText))
      }

      const token = raw.replace(/^"(.*)"$/, '$1').trim()
      if (!token) throw new Error('토큰을 받지 못했습니다.')

      localStorage.setItem(TOKEN_KEY, token)
      if (remember) {
        localStorage.setItem(REMEMBER_ID_KEY, officerId.trim())
      } else {
        localStorage.removeItem(REMEMBER_ID_KEY)
      }

      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      data-name="LogIn"
    >
      <img
        alt=""
        className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
        src={imgLogIn}
      />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col items-center px-4 pb-10 pt-7">
        <div className="relative size-[208px] shrink-0">
          <img
            alt="Case Lock"
            className="pointer-events-none absolute inset-0 size-full max-w-none object-cover"
            src={imgLogo}
          />
        </div>
        <h1 className="mt-3 text-center font-semibold leading-none">
          <span className="text-[clamp(2.5rem,8vw,5.32rem)] text-[#071b48]">
            Case
          </span>
          <span className="text-[clamp(2.5rem,8vw,5.32rem)] text-[#ff8a00]">
            {' '}
            Lock
          </span>
        </h1>

        <form
          onSubmit={handleSubmit}
          className="relative mt-10 w-full max-w-[618px] rounded-[15.2px] bg-white p-8 shadow-lg shadow-black/5 md:p-10"
        >
          {error ? (
            <p
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-[18px] text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <label
            className="block font-['Pretendard:Regular',sans-serif] text-[30px] text-black"
            htmlFor="officer-id"
          >
            Officer ID
          </label>
          <input
            id="officer-id"
            name="officerId"
            autoComplete="username"
            placeholder="Enter your officer ID"
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            className="font-['Pretendard:Thin',sans-serif] mt-3 h-[89px] w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 text-[32px] text-[#534545] outline-none placeholder:text-[#534545]/70 focus:border-[#081c47]"
          />

          <label
            className="font-['Pretendard:Regular',sans-serif] mt-8 block text-[30px] text-black"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-['Pretendard:Thin',sans-serif] mt-3 h-[89px] w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 text-[32px] text-[#534545] outline-none placeholder:text-[#534545]/70 focus:border-[#081c47]"
          />

          <label className="mt-8 flex cursor-pointer items-center gap-3 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[31px] rounded-[8px] border-2 border-[#d9d9d9] accent-[#081c47]"
            />
            <span className="font-['Pretendard:Regular',sans-serif] text-[25px] text-black">
              아이디 저장
            </span>
          </label>

          <div className="relative mt-10">
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex h-[89px] w-full items-center justify-center overflow-hidden rounded-[10px] bg-[#081c47] text-white disabled:opacity-60"
            >
              <img
                alt=""
                className="pointer-events-none absolute inset-0 size-full max-w-none"
                src={imgButtonBg}
              />
              <span className="relative font-['Pretendard:Bold',sans-serif] text-[36px]">
                {isLoading ? '처리 중…' : '로그인'}
              </span>
            </button>
          </div>
        </form>

        <p className="font-['Pretendard:ExtraLight',sans-serif] mt-10 text-center text-[30px] text-[#776060]">
          계정이 없으신가요?{' '}
          <Link
            to="/signup"
            className="text-black underline decoration-solid underline-offset-4"
          >
            회원가입
          </Link>
        </p>
        <p className="font-['Pretendard:ExtraLight',sans-serif] mt-6 max-w-[640px] text-center text-[22px] text-black">
          승인된 접근만 허용됩니다. 모든 활동은 해시체인 암호화로 기록됩니다.
        </p>
      </div>
    </div>
  )
}
