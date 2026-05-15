import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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
        <Route
          path="/CaseRegister"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <CaseRegisterPage />
            </div>
          }
        />
        <Route
          path="/EvidenceRegister"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <EvidenceRegisterPage />
            </div>
          }
        />
        <Route
          path="/EvidenceDetail/:evidenceId"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <EvidenceDetailPage />
            </div>
          }
        />
        <Route
          path="/CaseDetail/:caseId"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <CaseDetailPage />
            </div>
          }
        />
        <Route
          path="/Handover"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <HandoverPage />
            </div>
          }
        />
        <Route
          path="/MyPage"
          element={
            <div className="min-h-screen overflow-x-auto bg-[#f5f7fb]">
              <MyPage />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
