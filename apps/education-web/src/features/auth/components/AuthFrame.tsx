import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { BrandLogo } from '@apitech/brand'

export function AuthFrame({ children }: { children?: ReactNode }) {
  return <main className="auth-shell">
    <aside className="auth-intro">
      <Link className="auth-brand" to="/"><BrandLogo /><small>CAN STUDIO</small></Link>
      <div className="auth-intro-copy"><p className="auth-kicker">INSTRUCTOR LEARNING PLATFORM</p>
        <h1>เชื่อมความเข้าใจ<br /><span>สู่ห้องเรียน EV</span></h1>
        <p>สื่อประกอบการสอนเพื่อสำรวจระบบรถไฟฟ้า<br />ชิ้นส่วน และการสื่อสารบนเครือข่าย CAN</p>
        <div className="auth-network" aria-hidden="true"><span>VCU</span><i /><span>BMS</span><i /><span>MOTOR</span></div>
        <div className="auth-pills"><span>EV SYSTEMS</span><span>CAN EDUCATION</span><span>COMPONENT LAB</span></div>
      </div>
      <p className="auth-intro-footer">APITECH · EDUCATION & SIMULATION</p>
    </aside>
    <div className="auth-content">{children ?? <Outlet />}<footer>APITech CAN Studio · สื่อการสอนสำหรับอาจารย์</footer></div>
  </main>
}

export function AuthCard({ title, subtitle, children, label = 'MEMBER ACCESS' }: {
  title: string; subtitle?: string; children: ReactNode; label?: string
}) {
  return <section className="auth-card"><p className="auth-kicker">{label}</p><h2>{title}</h2>
    {subtitle && <p className="auth-subtitle">{subtitle}</p>}{children}</section>
}

export function Feedback({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' }) {
  return <div className={`auth-feedback ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function LoadingCard({ text = 'กำลังตรวจสอบสิทธิ์เข้าใช้งาน…' }: { text?: string }) {
  return <AuthCard title="กรุณารอสักครู่"><p className="auth-loading" role="status"><span />{text}</p></AuthCard>
}
