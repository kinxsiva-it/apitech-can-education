import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'
import {
  AuthFrame,
  AuthCard,
  Feedback,
  LoadingCard,
} from '../features/auth/components/AuthFrame'
import { SignOutButton } from '../features/auth/components/SignOutButton'
import { LoginPage, RegisterPage } from '../features/auth/pages/CredentialsPage'
import {
  ForgotPasswordPage,
  VerifyEmailPage,
} from '../features/auth/pages/EmailPage'
import { CallbackPage } from '../features/auth/pages/CallbackPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'
import { MembershipPage } from '../features/auth/pages/MembershipPage'
import { LandingPage } from '../ui/landing/LandingPage'

const Workspace = lazy(() =>
  import('../ui/workspace/EducationWorkspace').then((module) => ({
    default: module.EducationWorkspace,
  })),
)

function destination(
  access: NonNullable<ReturnType<typeof useAuth>['access']>,
) {
  return access.can_access_education
    ? '/learn'
    : access.email_confirmed
      ? '/membership'
      : '/verify-email'
}
function AccessFailure() {
  const { accessError, refreshAccess } = useAuth()
  return (
    <AuthCard
      title="ตรวจสอบสิทธิ์ไม่ได้"
      subtitle="ยังไม่สามารถเปิดหน้าเรียนได้ กรุณาลองใหม่หรือเข้าสู่ระบบใหม่"
    >
      <Feedback>
        {accessError ?? 'ระบบไม่พร้อมให้บริการ กรุณาลองอีกครั้ง'}
      </Feedback>
      <div className="auth-actions">
        <button className="auth-primary" onClick={refreshAccess}>
          ลองตรวจสอบอีกครั้ง
        </button>
        <SignOutButton />
      </div>
    </AuthCard>
  )
}
function GuestGate() {
  const { initialized, session, accessLoading, accessError, access, recovery } =
    useAuth()
  if (!initialized || (session && accessLoading && !access && !recovery))
    return <LoadingCard />
  if (session && recovery) return <Navigate to="/reset-password" replace />
  if (session && accessError) return <AccessFailure />
  if (session && access) return <Navigate to={destination(access)} replace />
  return <Outlet />
}
function SessionGate({ frame = false }: { frame?: boolean }) {
  const { initialized, session, accessLoading, accessError, access, recovery } =
    useAuth()
  const show = (element: ReactNode) =>
    frame ? <AuthFrame>{element}</AuthFrame> : element
  if (!initialized) return show(<LoadingCard />)
  if (!session) return <Navigate to="/login" replace />
  if (recovery) return <Navigate to="/reset-password" replace />
  if (accessLoading && !access) return show(<LoadingCard />)
  if (accessError || !access) return show(<AccessFailure />)
  if (!access.email_confirmed) return <Navigate to="/verify-email" replace />
  return <Outlet />
}
function LearningPage() {
  const { access, session } = useAuth()
  if (!access?.can_access_education)
    return <Navigate to="/membership" replace />
  return (
    <Suspense
      fallback={
        <AuthFrame>
          <LoadingCard text="กำลังเปิดพื้นที่สื่อการสอน…" />
        </AuthFrame>
      }
    >
      <Workspace
        accountActions={
          <div className="member-toolbar">
            <span title={session?.user.email}>{session?.user.email}</span>
            <SignOutButton />
          </div>
        }
      />
    </Suspense>
  )
}
function Landing() {
  const { linkError, recovery, session } = useAuth()
  if (linkError) return <Navigate to="/auth/callback" replace />
  if (recovery && session) return <Navigate to="/reset-password" replace />
  return <LandingPage />
}
function ConfiguredFrame() {
  const { configured } = useAuth()
  if (!configured)
    return (
      <AuthFrame>
        <AuthCard
          title="ระบบยังไม่พร้อมเชื่อมต่อ"
          subtitle="กรุณาติดต่อผู้ดูแลเพื่อตั้งค่าการเชื่อมต่อ แล้วเปิดหน้านี้ใหม่"
        >
          กรุณาลองใหม่ภายหลัง
        </AuthCard>
      </AuthFrame>
    )
  return <Outlet />
}
export function AuthRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<ConfiguredFrame />}>
        <Route element={<AuthFrame />}>
          <Route element={<GuestGate />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route element={<SessionGate />}>
            <Route path="/membership" element={<MembershipPage />} />
          </Route>
          <Route
            path="*"
            element={
              <AuthCard title="ไม่พบหน้าที่ต้องการ">
                <Link className="auth-primary" to="/">
                  กลับหน้าหลัก
                </Link>
              </AuthCard>
            }
          />
        </Route>
        <Route element={<SessionGate frame />}>
          <Route path="/learn/*" element={<LearningPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
