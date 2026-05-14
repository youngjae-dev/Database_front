import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { figma } from '../design/tokens'
import { apiFetch, parseApiErrorBody } from '../lib/api'
import type { LoginRequest } from '../types/auth'

const TOKEN_KEY = 'token'
const REMEMBER_ID_KEY = 'rememberedUsername'

function LoginPage() {
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
      className="relative min-h-screen w-full overflow-hidden font-['Pretendard',system-ui,sans-serif]"
      data-name="LogIn"
      style={{
        background: `linear-gradient(180deg, #eef3fb 0%, ${figma.pageBg} 42%, #e4eaf5 100%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_20%_10%,rgba(167,193,255,0.45)_0%,transparent_50%),radial-gradient(circle_at_80%_90%,rgba(8,28,71,0.08)_0%,transparent_45%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col items-center px-4 pb-10 pt-7">
        <img
          src="/caselock-logo.svg"
          alt="Case Lock"
          width={208}
          height={208}
          className="size-[clamp(120px,22vw,208px)] shrink-0 object-contain"
          decoding="async"
        />
        <h1 className="mt-3 text-center font-semibold leading-none">
          <span className="text-[clamp(2.5rem,8vw,5.32rem)] text-[#071b48]">Case</span>
          <span className="text-[clamp(2.5rem,8vw,5.32rem)] text-[#ff8a00]"> Lock</span>
        </h1>

        <form
          onSubmit={handleSubmit}
          className="relative mt-10 w-full max-w-[618px] rounded-[15.2px] border-2 border-[#D9D9D9] bg-white p-8 shadow-[1px_2px_10px_rgba(0,0,0,0.12)] md:p-10"
        >
          {error ? (
            <p
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-[18px] text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <label className="block text-[30px] text-black" htmlFor="officer-id">
            Officer ID
          </label>
          <input
            id="officer-id"
            name="officerId"
            autoComplete="username"
            placeholder="Enter your officer ID"
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            className="mt-3 h-[89px] w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 text-[32px] font-extralight text-[#534545] outline-none placeholder:text-[#534545]/70 focus:border-[#081c47]"
          />

          <label className="mt-8 block text-[30px] text-black" htmlFor="password">
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
            className="mt-3 h-[89px] w-full rounded-[10px] border-2 border-[#d9d9d9] px-4 text-[32px] font-extralight text-[#534545] outline-none placeholder:text-[#534545]/70 focus:border-[#081c47]"
          />

          <label className="mt-8 flex cursor-pointer items-center gap-3 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-[31px] rounded-[8px] border-2 border-[#d9d9d9] accent-[#081c47]"
            />
            <span className="text-[25px] text-black">아이디 저장</span>
          </label>

          <div className="mt-10">
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-[89px] w-full items-center justify-center rounded-[10px] bg-[#081c47] text-[36px] font-bold text-white shadow-sm transition hover:bg-[#0a2560] disabled:opacity-60"
            >
              {isLoading ? '처리 중…' : '로그인'}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-[30px] font-extralight" style={{ color: figma.loginMuted }}>
          계정이 없으신가요?{' '}
          <Link
            to="/signup"
            className="text-black underline decoration-solid underline-offset-4"
          >
            회원가입
          </Link>
        </p>
        <p className="mt-6 max-w-[640px] text-center text-[22px] font-extralight text-black">
          승인된 접근만 허용됩니다. 모든 활동은 해시체인 암호화로 기록됩니다.
        </p>
      </div>
    </div>
  )
}

export { LoginPage }
export default LoginPage
