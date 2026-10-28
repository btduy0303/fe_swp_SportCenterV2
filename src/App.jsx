import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import MemberDashboard from './pages/member/MemberDashboard'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard'
import CoachDashboard from './pages/coach/CoachDashboard'
import CoachTraining from './pages/training/CoachTraining'
import MemberTraining from './pages/training/MemberTraining'

// Bảo vệ route yêu cầu đăng nhập
function PrivateRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Đang xác thực tài khoản...</div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user) {
    const role = user.roleCode || (user.role && (typeof user.role === 'string' ? user.role : user.role.code))
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

// Bộ định tuyến chính của toàn ứng dụng
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>

          {/* Trang chủ công khai */}
          <Route path="/" element={<HomePage />} />

          {/* Xác thực tài khoản */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Flow 1 & Flow 2: Dashboard Hội Viên */}
          <Route
            path="/member"
            element={
              <PrivateRoute allowedRoles={['MEMBER', 'MANAGER', 'RECEPTIONIST']}>
                <MemberDashboard />
              </PrivateRoute>
            }
          />

          {/* Flow 1 & Flow 2: Dashboard Quản Lý */}
          <Route
            path="/manager"
            element={
              <PrivateRoute allowedRoles={['MANAGER']}>
                <ManagerDashboard />
              </PrivateRoute>
            }
          />

          {/* Flow 1 & Flow 2: Dashboard Nhân Viên Lễ Tân */}
          <Route
            path="/receptionist"
            element={
              <PrivateRoute allowedRoles={['RECEPTIONIST', 'MANAGER']}>
                <ReceptionistDashboard />
              </PrivateRoute>
            }
          />

          {/* Flow 2: Dashboard Huấn Luyện Viên */}
          <Route
            path="/coach"
            element={
              <PrivateRoute allowedRoles={['COACH']}>
                <CoachDashboard />
              </PrivateRoute>
            }
          />

          {/* Điều hướng mặc định */}
          <Route path="/coach/training" element={<PrivateRoute allowedRoles={['COACH']}><CoachTraining /></PrivateRoute>} />
          <Route path="/member/training" element={<PrivateRoute allowedRoles={['MEMBER']}><MemberTraining /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
)
}

