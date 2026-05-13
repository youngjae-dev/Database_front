import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CaseListPage } from './pages/CaseListPage'
import { EvidenceListPage } from './pages/EvidenceListPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/home"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <HomePage />
            </div>
          }
        />
        <Route
          path="/CaseList"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <CaseListPage />
            </div>
          }
        />
        <Route
          path="/EvidenceList"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <EvidenceListPage />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
