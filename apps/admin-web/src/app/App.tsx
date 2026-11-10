import { useState } from 'react'
import { getApiHealth } from '../lib/api'

const sections = [
  ['สมาชิก', 'ตรวจคำขอสมัคร อนุมัติ และจัดการสิทธิ์'],
  ['สถาบัน', 'จัดการรายชื่อสถาบันสำหรับผู้สมัคร'],
  ['Education', 'จัดการบทเรียน หัวข้อ และลำดับการสอน'],
  ['EV Component Lab', 'จัดการข้อมูลประกอบการสอนของชิ้นส่วน'],
  ['ประวัติการทำรายการ', 'ตรวจสอบการแก้ไขและการเผยแพร่'],
]

export default function App() {
  const [health, setHealth] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const checkHealth = async () => {
    setHealth('loading')
    try {
      await getApiHealth()
      setHealth('ok')
    } catch {
      setHealth('error')
    }
  }

  return (
    <main className="admin-shell">
      <header><span className="brand">API<span>TECH</span></span><span className="badge">ADMIN CMS · FOUNDATION</span></header>
      <section className="intro">
        <p className="eyebrow">EDUCATION MANAGEMENT</p>
        <h1>พื้นที่จัดการสื่อการสอน</h1>
        <p>โครงสร้างเริ่มต้นสำหรับผู้ดูแลระบบ ยังไม่เปิดใช้งานการเข้าสู่ระบบและการจัดการข้อมูล</p>
      </section>
      <section className="health-panel" aria-labelledby="health-heading">
        <div><h2 id="health-heading">สถานะการเชื่อมต่อ API</h2><p role="status" aria-live="polite">{
          health === 'ok' ? 'เชื่อมต่อ API สำเร็จ' : health === 'error' ? 'ยังเชื่อมต่อไม่ได้ กรุณาตรวจว่า API เปิดอยู่' : health === 'loading' ? 'กำลังตรวจสอบ…' : 'ยังไม่ได้ตรวจสอบ'
        }</p></div>
        <button onClick={checkHealth} disabled={health === 'loading'}>ตรวจการเชื่อมต่อ</button>
      </section>
      <section className="modules" aria-label="หมวดงาน CMS">
        {sections.map(([name, description]) => <article key={name}><span className="module-status">เตรียมพัฒนา</span><h2>{name}</h2><p>{description}</p></article>)}
      </section>
    </main>
  )
}
