import { useState } from 'react'
import { LabIcon } from './LabIcon'



const sections = [
  { id: 'education', label: 'EDUCATION', title: 'CAN BUS EDUCATION', thai: 'พื้นที่การเรียนรู้ CAN Bus', icon: 'book' },
  { id: 'simulation', label: 'EV SIMULATION', title: 'VIRTUAL EV WORKSPACE', thai: 'พื้นที่จำลองระบบยานยนต์ไฟฟ้า', icon: 'vehicle' },
  { id: 'monitor', label: 'CAN MONITOR', title: 'CAN BUS MONITOR', thai: 'พื้นที่ตรวจสอบการสื่อสาร', icon: 'activity' },
  { id: 'decoder', label: 'SIGNAL DECODER', title: 'SIGNAL DECODER', thai: 'พื้นที่ถอดรหัสสัญญาณ', icon: 'code' },
  { id: 'fault', label: 'FAULT LAB', title: 'FAULT DIAGNOSIS LAB', thai: 'พื้นที่ฝึกวิเคราะห์ปัญหา', icon: 'tool' },
  { id: 'instructor', label: 'INSTRUCTOR', title: 'INSTRUCTOR WORKSPACE', thai: 'พื้นที่สำหรับผู้สอน', icon: 'instructor' },
] as const

const topics = [
  'พื้นฐานเครือข่าย CAN Bus',
  'Physical Layer & Wiring',
  'CAN Frame Structure',
  'Arbitration & Bit Timing',
  'Signal Decoding & DBC',
  'Monitoring & Recording',
  'EV Network & ECU',
  'Troubleshooting',
]

export function EducationWorkspace() {
  const [active, setActive] = useState<string>('education')
  const [topic, setTopic] = useState(topics[0])
  const current = sections.find((section) => section.id === active) ?? sections[0]

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <a className="brand" href="./" aria-label="APITech CAN Studio home">
          <span className="brand-mark">API<span>TECH</span><i /></span>
          <span className="brand-rule" />
          <span className="brand-title">CAN STUDIO<small>CAN BUS EDUCATION & SIMULATION</small></span>
        </a>
        <div className="header-meta"><span className="edition">EDUCATION EDITION</span><span className="preview-label"><i /> UI PREVIEW</span></div>
      </header>

      <nav className="main-tabs" aria-label="พื้นที่การเรียนรู้">
        {sections.map((section) => (
          <button key={section.id} className={active === section.id ? 'main-tab active' : 'main-tab'}
            aria-current={active === section.id ? 'page' : undefined}
            onClick={() => setActive(section.id)}>
            <LabIcon name={section.icon} />{section.label}
          </button>
        ))}
      </nav>

      <main className="lab-main">
        <div className="page-heading">
          <div><div className="eyebrow">APITECH LEARNING WORKSPACE</div><h1>{current.title}<span> / {current.thai}</span></h1></div>
          <span className="outline-tag">INTERFACE CONCEPT</span>
        </div>

        <div className="workspace-grid">
          <aside className="curriculum panel">
            <div className="panel-heading"><LabIcon name="book" /><h2>LEARNING MODULES</h2></div>
            <div className="side-caption">หัวข้อการเรียนรู้</div>
            <nav aria-label="หัวข้อบทเรียน" className="topic-list">
              {topics.map((label) => (
                <button key={label} className={topic === label ? 'topic selected' : 'topic'}
                  aria-pressed={topic === label} onClick={() => { setTopic(label); setActive('education') }}>
                  <span className="topic-marker" /><span>{label}</span><span className="chevron">›</span>
                </button>
              ))}
            </nav>
            <div className="curriculum-bottom"><LabIcon name="layers" /><div>LEARN. EXPLORE. UNDERSTAND.<small>CAN BUS • EV • VIRTUAL LAB</small></div></div>
          </aside>

          <section className="main-workspace panel" aria-labelledby="workspace-title">
            <div className="workspace-toolbar"><div className="panel-heading"><LabIcon name={current.icon} /><h2 id="workspace-title">{active === 'education' ? 'LESSON WORKSPACE' : current.label}</h2></div><span className="toolbar-caption">WORKSPACE</span></div>
            <div className="workspace-canvas">
              <div className="canvas-corner top-left" /><div className="canvas-corner top-right" />
              <div className="canvas-corner bottom-left" /><div className="canvas-corner bottom-right" />
              <div className="empty-workspace">
                <div className="workspace-emblem"><LabIcon name={current.icon} /></div>
                <span className="eyebrow">CAN BUS LEARNING PLATFORM</span>
                <h3>{active === 'education' ? topic : current.thai}</h3>
                <span className="empty-label">พื้นที่สำหรับ{active === 'education' ? 'เนื้อหาและสื่อการเรียนรู้' : current.thai.replace('พื้นที่', '')}</span>
                <div className="empty-divider"><span /><i /><span /></div>
              </div>
              <span className="canvas-label">APITECH / EDUCATION WORKSPACE</span>
            </div>
            <div className="workspace-bottom"><span><i /> LESSON VIEW</span><span>VISUAL LEARNING ENVIRONMENT</span></div>
          </section>

          <aside className="lesson-sidebar">
            <section className="panel outline-panel"><div className="panel-heading"><LabIcon name="layers" /><h2>LESSON OUTLINE</h2></div>
              <div className="outline-item"><span className="small-rule" /><h3>วัตถุประสงค์การเรียนรู้</h3><div className="blank-line" /><div className="blank-line short" /></div>
              <div className="outline-item"><span className="small-rule blue" /><h3>แนวคิดสำคัญ</h3><div className="blank-line" /><div className="blank-line short" /></div>
              <div className="outline-item"><span className="small-rule" /><h3>กิจกรรมทดลอง</h3><div className="blank-line" /><div className="blank-line short" /></div>
            </section>
            <section className="panel knowledge-panel"><div className="panel-heading"><LabIcon name="check" /><h2>KNOWLEDGE CHECK</h2></div><div className="knowledge-placeholder"><LabIcon name="check" /><span>พื้นที่ทบทวนความเข้าใจ</span></div></section>
            <div className="instructor-note"><LabIcon name="instructor" /><span>INSTRUCTOR NOTES<small>พื้นที่คำแนะนำสำหรับผู้สอน</small></span></div>
          </aside>

          <section className="panel monitor-preview" aria-labelledby="monitor-title">
            <div className="monitor-heading"><div className="panel-heading"><LabIcon name="activity" /><h2 id="monitor-title">CAN FRAME MONITOR</h2></div><span className="toolbar-caption">RAW FRAME WORKSPACE</span></div>
            <div className="table-scroll"><table><thead><tr>{['TIMESTAMP', 'CHANNEL', 'CAN ID', 'DLC', 'DATA (HEX)', 'SOURCE'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody><tr><td colSpan={6}>พื้นที่แสดง CAN Frames</td></tr></tbody></table></div>
          </section>
        </div>
      </main>
      <footer className="lab-footer"><span><i /> APITECH CAN STUDIO</span><span>EDUCATION & SIMULATION PLATFORM</span><span>UI CONCEPT · NO SIMULATION DATA</span></footer>
    </div>
  )
}


