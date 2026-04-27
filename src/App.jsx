import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CallPage from './pages/CallPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import CallingListPage from './pages/CallingListPage.jsx'
import DialpadPage from './pages/DialpadPage.jsx'
import MigratePage from './pages/MigratePage.jsx'
import AppShell from './components/AppShell.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="call/:id"     element={<CallPage />} />
        <Route path="chat/:id"     element={<ChatPage />} />
        <Route path="calling-list" element={<CallingListPage />} />
        <Route path="dialpad"      element={<DialpadPage />} />
        <Route path="migrate"      element={<MigratePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
