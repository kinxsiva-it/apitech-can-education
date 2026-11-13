import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrandLogo } from '@apitech/brand'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import type { AdminNotification, Page } from '@apitech/contracts'
import { AdminProvider } from '../auth/AdminProvider'
import { useAdmin } from '../auth/context'
import { supabase } from '../lib/supabase'
import { useResource } from '../shared/useResource'
import { Busy, Notice } from '../shared/ui'
import { AdminIcon } from '../shared/AdminIcon'
const Members = lazy(() => import('../features/members/MembersPage'))
const Institutions = lazy(
  () => import('../features/management/InstitutionsPage'),
)
const Notifications = lazy(
  () => import('../features/management/NotificationsPage'),
)
const Audit = lazy(() => import('../features/management/AuditPage'))
const Emails = lazy(() => import('../features/management/EmailPage'))
const Content = lazy(() => import('../features/content/ContentPage'))

function Brand() {
  return (
    <span className="cms-brand">
      <BrandLogo />
      <small>EDUCATION · ADMIN CMS</small>
    </span>
  )
}
function Login() {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [show, setShow] = useState(false)
  const { session, initialized } = useAdmin()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (result.error) throw result.error
      setPassword('')
    } catch {
      setError(
        'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมลและรหัสผ่าน หากลืมรหัสผ่านให้ติดต่อผู้พัฒนา',
      )
    } finally {
      setBusy(false)
    }
  }
  if (!initialized) return <Busy />
  if (session) return <Navigate to="/" replace />
  return (
    <main className="cms-login">
      <section className="cms-login-intro">
        <Brand />
        <div>
          <p className="cms-eyebrow">EDUCATION MANAGEMENT</p>
          <h1>
            เบื้องหลังห้องเรียน
            <br />
            <span>ที่พร้อมสำหรับทุกบทเรียน</span>
          </h1>
          <p>
            จัดการสมาชิก ดูแลเนื้อหา และตรวจสอบการเผยแพร่
            <br />
            จากพื้นที่ทำงานเดียวของผู้ดูแล
          </p>
        </div>
        <small>APITECH CAN EDUCATION / ADMINISTRATOR</small>
      </section>
      <section className="cms-login-form">
        <div className="cms-login-emblem">
          <AdminIcon name="shield" />
        </div>
        <p className="cms-eyebrow">AUTHORIZED ACCESS</p>
        <h2>เข้าสู่ระบบผู้ดูแล</h2>
        <p>ใช้บัญชี Admin ที่ผู้พัฒนาจัดเตรียมให้</p>
        {!supabase ? (
          <Notice>
            ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase กรุณาติดต่อผู้พัฒนา
          </Notice>
        ) : (
          <form className="cms-form" onSubmit={submit}>
            <label>
              อีเมล
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              รหัสผ่าน
              <div className="cms-password">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  onClick={() => setShow(!show)}
                >
                  <AdminIcon name={show ? 'eye-off' : 'eye'} />
                </button>
              </div>
            </label>
            {error && <Notice>{error}</Notice>}
            <button className="primary" disabled={busy}>
              {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ →'}
            </button>
          </form>
        )}
        <p className="cms-hint">
          การสร้างบัญชีและกู้คืนรหัสผ่าน Admin ให้ผู้พัฒนาดูแล
        </p>
      </section>
    </main>
  )
}
function Protected() {
  const { initialized, session, access, checking, error, refresh, logout } =
    useAdmin()
  if (!initialized || checking) return <Busy />
  if (!session) return <Navigate to="/login" replace />
  if (error || access?.role !== 'admin' || !access.can_access_education)
    return (
      <main className="cms-access-error">
        <Brand />
        <h1>{error ? 'ตรวจสอบสิทธิ์ไม่ได้' : 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล'}</h1>
        <Notice>
          {error ||
            'เฉพาะ Admin ที่ได้รับสิทธิ์จากผู้พัฒนาเท่านั้นที่เข้าถึง CMS ได้'}
        </Notice>
        <div className="cms-inline">
          <button onClick={refresh}>ตรวจสอบอีกครั้ง</button>
          <button onClick={() => void logout()}>ออกจากระบบ</button>
        </div>
      </main>
    )
  return <Outlet />
}
const navigation = [
  ['/', 'ภาพรวม', 'overview'],
  ['/members', 'สมาชิก', 'members'],
  ['/requests', 'คำขอใช้งาน', 'check'],
  ['/institutions', 'สถาบัน / หน่วยงาน', 'institution'],
  ['/content/education', 'Education', 'education'],
  ['/content/components', 'EV Component Lab', 'component'],
  ['/notifications', 'การแจ้งเตือน', 'bell'],
  ['/emails', 'สถานะอีเมล', 'mail'],
  ['/audit', 'ประวัติการทำรายการ', 'history'],
] as const
function Shell() {
  const { pathname } = useLocation()
  const currentPage =
    navigation.find(([path]) => path === pathname)?.[1] ?? 'Admin Workspace'
  const sidebarRef = useRef<HTMLElement>(null)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)
  const { session, logout } = useAdmin(),
    [menu, setMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('apitech-admin-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem('apitech-admin-sidebar-collapsed', String(next))
    } catch {
      /* Keep the preference in memory when storage is unavailable. */
    }
  }
  const notifications = useResource<
    Page<AdminNotification> & { unread: number }
  >('/admin/notifications?limit=20&offset=0')
  const pendingRequests = useResource<Page<unknown>>(
    '/admin/members?status=pending&limit=1&offset=0',
  )
  const unreadCount =
    notifications.data?.unread ?? notifications.previousData?.unread
  const pendingCount =
    pendingRequests.data?.total ?? pendingRequests.previousData?.total
  const reload = notifications.reload
  const reloadPending = pendingRequests.reload
  useEffect(() => {
    const refreshCounts = () => {
      reload()
      reloadPending()
    }
    const timer = setInterval(refreshCounts, 30000)
    window.addEventListener('cms:mutated', refreshCounts)
    window.addEventListener('cms:notifications-read', reload)
    return () => {
      clearInterval(timer)
      window.removeEventListener('cms:mutated', refreshCounts)
      window.removeEventListener('cms:notifications-read', reload)
    }
  }, [reload, reloadPending])
  useEffect(() => {
    if (!menu) return
    const mobile = window.matchMedia('(max-width: 820px)')
    sidebarRef.current?.querySelector<HTMLAnchorElement>('nav a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenu(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled)',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      const first = items[0],
        last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const onResize = () => {
      if (!mobile.matches) setMenu(false)
    }
    window.addEventListener('keydown', onKey)
    mobile.addEventListener('change', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      mobile.removeEventListener('change', onResize)
      if (mobileToggleRef.current?.getClientRects().length)
        mobileToggleRef.current.focus()
    }
  }, [menu])
  return (
    <div className={`cms-shell${collapsed ? ' is-collapsed' : ''}`}>
      {menu && (
        <button
          className="cms-sidebar-backdrop"
          aria-label="ปิดเมนูด้านข้าง"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="cms-sidebar"
        className={`cms-sidebar ${menu ? 'open' : ''}`}
      >
        <Link to="/" onClick={() => setMenu(false)}>
          <Brand />
        </Link>
        <button
          className="cms-drawer-close"
          aria-label="ปิดเมนู"
          onClick={() => setMenu(false)}
        >
          <AdminIcon name="close" />
        </button>
        <button
          className="cms-sidebar-toggle"
          aria-controls="cms-sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'ขยายแถบเมนู' : 'พับแถบเมนู'}
          title={collapsed ? 'ขยายแถบเมนู' : 'พับแถบเมนู'}
          onClick={toggleSidebar}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m14 7-5 5 5 5" />
          </svg>
        </button>
        <p className="cms-nav-label">WORKSPACE</p>
        <nav aria-label="เมนูผู้ดูแล">
          {navigation.map(([path, label, icon]) => (
            <NavLink
              key={path}
              to={path!}
              end={path === '/'}
              onClick={() => setMenu(false)}
              aria-label={
                path === '/requests' && pendingCount
                  ? `${label} รออนุมัติ ${pendingCount} รายการ`
                  : label
              }
              title={
                path === '/requests' && pendingCount
                  ? `${label} · รออนุมัติ ${pendingCount} รายการ`
                  : label
              }
            >
              <span className="cms-nav-icon" aria-hidden="true">
                <AdminIcon name={icon} />
              </span>
              <span className="cms-nav-text">{label}</span>
              {path === '/notifications' && Boolean(unreadCount) && (
                <b>{unreadCount}</b>
              )}
              {path === '/requests' && Boolean(pendingCount) && (
                <b className="cms-request-count">{pendingCount}</b>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="cms-sidebar-note">
          <span>
            <AdminIcon name="layers" />
            CONTENT WORKFLOW
          </span>
          <p>บันทึกร่าง → ดูตัวอย่าง → เผยแพร่</p>
          <small>ทุกการเปลี่ยนแปลงมีประวัติให้ตรวจสอบ</small>
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <div className="cms-inline">
            <button
              ref={mobileToggleRef}
              className="cms-menu-toggle"
              aria-expanded={menu}
              aria-controls="cms-sidebar"
              aria-label="เปิดปิดเมนู"
              onClick={() => setMenu(!menu)}
            >
              <AdminIcon name="menu" />
            </button>
            <p className="cms-breadcrumb">
              <span>WORKSPACE</span>
              <i>/</i>
              <strong>{currentPage}</strong>
            </p>
          </div>
          <div className="cms-inline">
            <Link
              className="cms-notification-link"
              to="/notifications"
              aria-label={`การแจ้งเตือน ${unreadCount ?? 0} รายการที่ยังไม่อ่าน`}
            >
              <AdminIcon name="bell" />
              {Boolean(unreadCount) && <span>{unreadCount}</span>}
            </Link>
            <div className="cms-account">
              <span className="cms-account-avatar" aria-hidden="true">
                {session?.user.email?.slice(0, 1).toUpperCase() ?? 'A'}
              </span>
              <div>
                <small>ADMINISTRATOR</small>
                <span className="cms-user-email" title={session?.user.email}>
                  {session?.user.email}
                </span>
              </div>
            </div>
            <button
              className="cms-logout"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              onClick={() => void logout()}
            >
              <AdminIcon name="logout" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </header>
        <main className="cms-workspace">
          <Suspense fallback={<Busy />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="cms-footer">
          APITECH CAN EDUCATION{' '}
          <span>
            ADMIN WORKSPACE · เนื้อหาฉบับร่างจะยังไม่แสดงบนเว็บ Education
          </span>
        </footer>
      </div>
    </div>
  )
}
function Dashboard() {
  const all = useResource<Page<unknown>>('/admin/members?limit=1&offset=0')
  const pending = useResource<Page<unknown>>(
    '/admin/members?status=pending&limit=1&offset=0',
  )
  const approved = useResource<Page<unknown>>(
    '/admin/members?status=approved&limit=1&offset=0',
  )
  const cards = [
    {
      label: 'บัญชีที่ลงทะเบียนทั้งหมด',
      resource: all,
      icon: 'members',
      caption: 'ACCOUNT DIRECTORY',
      to: '/members?status=all',
    },
    {
      label: 'คำขอรออนุมัติ',
      resource: pending,
      icon: 'history',
      caption: 'AWAITING REVIEW',
      to: '/requests',
    },
    {
      label: 'สมาชิกที่อนุมัติแล้ว',
      resource: approved,
      icon: 'check',
      caption: 'APPROVED INSTRUCTORS',
      to: '/members',
    },
  ] as const
  return (
    <>
      <div className="cms-page-heading">
        <div>
          <p className="cms-eyebrow">WORKSPACE OVERVIEW</p>
          <h1>พร้อมดูแลห้องเรียนของคุณ</h1>
          <p>ตรวจคำขอสมาชิกและเตรียมสื่อการสอนก่อนเผยแพร่</p>
        </div>
        <span className="cms-workspace-badge">
          <AdminIcon name="shield" />
          ADMIN WORKSPACE
        </span>
      </div>
      <div className="cms-stats">
        {cards.map(({ label, resource: r, icon, caption, to }) => (
          <Link to={to} key={label}>
            <div className="cms-stat-heading">
              <span>{label}</span>
              <span className="cms-stat-icon">
                <AdminIcon name={icon} />
              </span>
            </div>
            <strong>{r.error ? '—' : (r.data?.total ?? '…')}</strong>
            <span className="cms-stat-caption">{caption}</span>
            <small className="cms-stat-link">
              {r.error
                ? 'โหลดข้อมูลไม่ได้ เปิดหน้าสมาชิกเพื่อลองใหม่'
                : 'ดูรายการสมาชิก →'}
              <AdminIcon name="arrow" />
            </small>
          </Link>
        ))}
      </div>
      <section className="cms-welcome">
        <div>
          <p className="cms-eyebrow">START WITH YOUR COMMUNITY</p>
          <h2>มีผู้สอนรอเข้าห้องเรียนอยู่หรือเปล่า?</h2>
          <p>ตรวจข้อมูลผู้สมัครก่อนอนุมัติสิทธิ์ใช้งานสื่อการสอนทุกหมวด</p>
          <Link className="cms-button primary" to="/requests">
            จัดการคำขอสมาชิก →
          </Link>
        </div>
        <div className="cms-welcome-visual" aria-hidden="true">
          <div className="cms-welcome-orbit">
            <span>
              <AdminIcon name="members" />
            </span>
            <i />
            <i />
          </div>
          <span>PEOPLE. KNOWLEDGE. CONNECTED.</span>
        </div>
      </section>
      <div className="cms-dashboard-grid">
        <section className="cms-panel">
          <div className="cms-card-heading">
            <span className="cms-card-icon">
              <AdminIcon name="education" />
            </span>
            <div>
              <p className="cms-eyebrow">CONTENT LIBRARY</p>
              <h2>จัดเตรียมเนื้อหา</h2>
            </div>
          </div>
          <p>เพิ่มบทเรียน หัวข้อ และรูปภาพได้โดยยังไม่กระทบเว็บไซต์จริง</p>
          <Link className="cms-button" to="/content/education">
            จัดการ Education →
          </Link>
          <Link className="cms-button" to="/content/components">
            จัดการ EV Component Lab →
          </Link>
        </section>
        <section className="cms-panel">
          <div className="cms-card-heading">
            <span className="cms-card-icon">
              <AdminIcon name="layers" />
            </span>
            <div>
              <p className="cms-eyebrow">PUBLISH WITH CONFIDENCE</p>
              <h2>ตรวจสอบก่อนแสดงจริง</h2>
            </div>
          </div>
          <ol>
            <li>บันทึกร่างที่แก้ไข</li>
            <li>เปิดตัวอย่างและตรวจเนื้อหา</li>
            <li>ยืนยันเผยแพร่ฉบับที่ตรวจแล้ว</li>
          </ol>
          <p>
            หากพบข้อผิดพลาดของระบบ ให้แจ้งผู้พัฒนา
            หากเป็นเนื้อหาให้แก้ร่างหรือย้อนเวอร์ชัน
          </p>
          <Link to="/audit">เปิดประวัติการทำรายการ →</Link>
        </section>
      </div>
    </>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route
                path="members"
                element={<Members key="members" mode="members" />}
              />
              <Route
                path="requests"
                element={<Members key="requests" mode="requests" />}
              />
              <Route path="institutions" element={<Institutions />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="audit" element={<Audit />} />
              <Route path="emails" element={<Emails />} />
              <Route
                path="content/education"
                element={<Content collection="education" />}
              />
              <Route
                path="content/components"
                element={<Content collection="components" />}
              />
              <Route
                path="*"
                element={
                  <>
                    <h1>ไม่พบหน้าที่ต้องการ</h1>
                    <Link to="/">กลับหน้าภาพรวม</Link>
                  </>
                }
              />
            </Route>
          </Route>
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  )
}
