import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { apiFetch } from './lib/api'
import CaseDetailPage from './pages/CaseDetailPage'
import CaseListPage from './pages/CaseListPage'
import CaseRegisterPage from './pages/CaseRegisterPage'
import EvidenceDetailPage from './pages/EvidenceDetailPage'
import EvidenceListPage from './pages/EvidenceListPage'
import EvidenceRegisterPage from './pages/EvidenceRegisterPage'
import HandoverPage from './pages/HandoverPage'
import HomePage from './pages/HomePage'
import MyPage from './pages/MyPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'

const TOKEN_KEY = 'token'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)
  const token =
    typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)

  useEffect(() => {
    let ignore = false

    async function verifyToken() {
      if (!token) {
        setIsAllowed(false)
        setIsChecking(false)
        return
      }

      try {
        const res = await apiFetch('/auth/me')
        if (!ignore) {
          setIsAllowed(res.ok)
          if (!res.ok) localStorage.removeItem(TOKEN_KEY)
        }
      } catch {
        if (!ignore) {
          setIsAllowed(false)
          localStorage.removeItem(TOKEN_KEY)
        }
      } finally {
        if (!ignore) setIsChecking(false)
      }
    }

    void verifyToken()
    return () => {
      ignore = true
    }
  }, [token])

  if (isChecking) {
    return <div className="min-h-screen bg-[#f5f7fb]" />
  }

  if (!isAllowed) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return children
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
        {children}
      </div>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/home"
          element={
            <ProtectedPage>
              <HomePage />
            </ProtectedPage>
          }
        />
        <Route
          path="/CaseList"
          element={
            <ProtectedPage>
              <CaseListPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/EvidenceList"
          element={
            <ProtectedPage>
              <EvidenceListPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/CaseRegister"
          element={
            <ProtectedPage>
              <CaseRegisterPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/EvidenceRegister"
          element={
            <ProtectedPage>
              <EvidenceRegisterPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/EvidenceDetail/:evidenceId"
          element={
            <ProtectedPage>
              <EvidenceDetailPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/CaseDetail/:caseId"
          element={
            <ProtectedPage>
              <CaseDetailPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/Handover"
          element={
            <ProtectedPage>
              <HandoverPage />
            </ProtectedPage>
          }
        />
        <Route
          path="/MyPage"
          element={
            <ProtectedPage>
              <MyPage />
            </ProtectedPage>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
