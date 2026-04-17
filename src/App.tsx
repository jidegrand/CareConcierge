import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from '@/hooks/useAuth'
import { NotificationsProvider } from '@/hooks/useNotifications'
import LoginPage       from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import SetPasswordPage from '@/pages/SetPasswordPage'
import PatientPage     from '@/pages/PatientPage'
import NurseDashboard  from '@/pages/NurseDashboard'
import PatientFeedPage from '@/pages/PatientFeedPage'
import BayMapPage      from '@/pages/BayMapPage'
import StaffingPage    from '@/pages/StaffingPage'
import QRSheetPage     from '@/pages/QRSheetPage'
import ReportsPage     from '@/pages/ReportsPage'
import AdminPage       from '@/pages/AdminPage'
import SettingsPage    from '@/pages/SettingsPage'
import UserGuidePage   from '@/pages/UserGuidePage'

const PlatformLayout = lazy(() => import('@/pages/platform/PlatformLayout'))
const PlatformOverviewPage = lazy(() => import('@/pages/platform/PlatformOverviewPage'))
const PlatformOrganizationsPage = lazy(() => import('@/pages/platform/PlatformOrganizationsPage'))
const PlatformLicensingPage = lazy(() => import('@/pages/platform/PlatformLicensingPage'))
const PlatformAccessControlPage = lazy(() => import('@/pages/platform/PlatformAccessControlPage'))
const PlatformGlobalReportsPage = lazy(() => import('@/pages/platform/PlatformGlobalReportsPage'))
const PlatformAuditLogsPage = lazy(() => import('@/pages/platform/PlatformAuditLogsPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  if (profile?.role === 'super_admin') return <Navigate to="/platform" replace />
  return <Navigate to="/dashboard" replace />
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider()
  return (
    <AuthContext.Provider value={auth}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </AuthContext.Provider>
  )
}

function PlatformModuleLoader({
  children,
  fullscreen = false,
}: {
  children: React.ReactNode
  fullscreen?: boolean
}) {
  return (
    <Suspense fallback={
      <div className={`${fullscreen ? 'min-h-screen bg-[var(--page-bg)]' : 'min-h-[240px]'} flex items-center justify-center`}>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
          Loading platform console…
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/r/:roomId"  element={<PatientPage />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/set-password"   element={<SetPasswordPage />} />
          <Route path="/dashboard"  element={<ProtectedRoute><NurseDashboard  /></ProtectedRoute>} />
          <Route path="/feed"       element={<ProtectedRoute><PatientFeedPage /></ProtectedRoute>} />
          <Route path="/bay-map"    element={<ProtectedRoute><BayMapPage      /></ProtectedRoute>} />
          <Route path="/staffing"   element={<ProtectedRoute><StaffingPage    /></ProtectedRoute>} />
          <Route path="/qr-sheet"   element={<ProtectedRoute><QRSheetPage     /></ProtectedRoute>} />
          <Route path="/reports"    element={<ProtectedRoute><ReportsPage     /></ProtectedRoute>} />
          <Route path="/platform" element={<ProtectedRoute><PlatformModuleLoader fullscreen><PlatformLayout /></PlatformModuleLoader></ProtectedRoute>}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<PlatformModuleLoader><PlatformOverviewPage /></PlatformModuleLoader>} />
            <Route path="organizations" element={<PlatformModuleLoader><PlatformOrganizationsPage /></PlatformModuleLoader>} />
            <Route path="licensing" element={<PlatformModuleLoader><PlatformLicensingPage /></PlatformModuleLoader>} />
            <Route path="access-control" element={<PlatformModuleLoader><PlatformAccessControlPage /></PlatformModuleLoader>} />
            <Route path="global-reports" element={<PlatformModuleLoader><PlatformGlobalReportsPage /></PlatformModuleLoader>} />
            <Route path="audit-logs" element={<PlatformModuleLoader><PlatformAuditLogsPage /></PlatformModuleLoader>} />
          </Route>
          <Route path="/admin/*"    element={<ProtectedRoute><AdminPage       /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute><SettingsPage    /></ProtectedRoute>} />
          <Route path="/support"    element={<ProtectedRoute><SettingsPage    /></ProtectedRoute>} />
          <Route path="/guide"      element={<ProtectedRoute><UserGuidePage   /></ProtectedRoute>} />
          <Route path="*"           element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
