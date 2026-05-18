import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from '@/hooks/useAuth'
import { NotificationsProvider } from '@/hooks/useNotifications'
import { peekInitialAuthCallback } from '@/lib/supabase'
import PublicTenantShell from '@/pages/PublicTenantShell'
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
import PatientGuidePage from '@/pages/PatientGuidePage'
import AdminGuidePage  from '@/pages/AdminGuidePage'

const PlatformLayout = lazy(() => import('@/pages/platform/PlatformLayout'))
const PlatformOverviewPage = lazy(() => import('@/pages/platform/PlatformOverviewPage'))
const PlatformOrganizationsPage = lazy(() => import('@/pages/platform/PlatformOrganizationsPage'))
const PlatformLicensingPage = lazy(() => import('@/pages/platform/PlatformLicensingPage'))
const PlatformAccessControlPage = lazy(() => import('@/pages/platform/PlatformAccessControlPage'))
const PlatformGlobalReportsPage = lazy(() => import('@/pages/platform/PlatformGlobalReportsPage'))
const PlatformAuditLogsPage = lazy(() => import('@/pages/platform/PlatformAuditLogsPage'))
const SuperAdminGuidePage = lazy(() => import('@/pages/platform/SuperAdminGuidePage'))

// Tenant Admin Portal
const TenantAdminShell = lazy(() => import('@/pages/tenant-admin/TenantAdminShell'))
const TenantDashboardPage = lazy(() => import('@/pages/tenant-admin/TenantDashboardPage'))
const TenantSettingsPage = lazy(() => import('@/pages/tenant-admin/SettingsPage'))
const TenantUsersPage = lazy(() => import('@/pages/tenant-admin/UsersPage'))
const TenantSitesPage = lazy(() => import('@/pages/tenant-admin/SitesAndUnitsPage'))
const TenantLicensingPage = lazy(() => import('@/pages/tenant-admin/LicensingPage'))
const TenantAuditLogsPage = lazy(() => import('@/pages/tenant-admin/AuditLogsPage'))

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

function getAuthLinkType(searchString: string, hashString: string) {
  const search = new URLSearchParams(searchString)
  const hash = new URLSearchParams(hashString.replace(/^#/, ''))
  return hash.get('type') ?? search.get('type')
}

function AuthLinkRedirect({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const authLinkType = getAuthLinkType(location.search, location.hash)
  const initialAuthCallback = peekInitialAuthCallback()

  if (location.pathname !== '/reset-password' && (authLinkType === 'recovery' || initialAuthCallback.isPasswordRecovery)) {
    return <Navigate to={`/reset-password${location.search}${location.hash}`} replace />
  }

  if (location.pathname !== '/set-password' && (authLinkType === 'invite' || initialAuthCallback.isInvite)) {
    return <Navigate to={`/set-password${location.search}${location.hash}`} replace />
  }

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
  if (profile?.role === 'tenant_admin') return <Navigate to="/tenant-admin" replace />
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

function TenantAdminModuleLoader({
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
          Loading organization admin…
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
        <AuthLinkRedirect>
          <Routes>
            <Route path="/r/:roomId"  element={<PublicTenantShell><PatientPage /></PublicTenantShell>} />
            <Route path="/patient-guide" element={<PublicTenantShell><PatientGuidePage /></PublicTenantShell>} />
            <Route path="/login"      element={<PublicTenantShell><LoginPage /></PublicTenantShell>} />
            <Route path="/reset-password" element={<PublicTenantShell><ResetPasswordPage /></PublicTenantShell>} />
            <Route path="/set-password"   element={<PublicTenantShell><SetPasswordPage /></PublicTenantShell>} />
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
            <Route path="/tenant-admin" element={<ProtectedRoute><TenantAdminModuleLoader fullscreen><TenantAdminShell /></TenantAdminModuleLoader></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<TenantAdminModuleLoader><TenantDashboardPage /></TenantAdminModuleLoader>} />
              <Route path="settings" element={<TenantAdminModuleLoader><TenantSettingsPage /></TenantAdminModuleLoader>} />
              <Route path="users" element={<TenantAdminModuleLoader><TenantUsersPage /></TenantAdminModuleLoader>} />
              <Route path="sites" element={<TenantAdminModuleLoader><TenantSitesPage /></TenantAdminModuleLoader>} />
              <Route path="licensing" element={<TenantAdminModuleLoader><TenantLicensingPage /></TenantAdminModuleLoader>} />
              <Route path="audit-logs" element={<TenantAdminModuleLoader><TenantAuditLogsPage /></TenantAdminModuleLoader>} />
            </Route>
            <Route path="/admin/*"    element={<ProtectedRoute><AdminPage       /></ProtectedRoute>} />
            <Route path="/settings"   element={<ProtectedRoute><SettingsPage    /></ProtectedRoute>} />
            <Route path="/support"    element={<ProtectedRoute><SettingsPage    /></ProtectedRoute>} />
            <Route path="/guide"       element={<ProtectedRoute><UserGuidePage   /></ProtectedRoute>} />
            <Route path="/admin-guide" element={<ProtectedRoute><AdminGuidePage  /></ProtectedRoute>} />
            <Route path="/super-admin-guide" element={<ProtectedRoute><PlatformModuleLoader fullscreen><SuperAdminGuidePage /></PlatformModuleLoader></ProtectedRoute>} />
            <Route path="*"           element={<HomeRedirect />} />
          </Routes>
        </AuthLinkRedirect>
      </AuthProvider>
    </BrowserRouter>
  )
}
