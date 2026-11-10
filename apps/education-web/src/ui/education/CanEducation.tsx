import { LabIcon } from '../shared/icons/LabIcon'
import { educationTopics } from './topics'

interface CanEducationProps {
  topic: string | undefined
  onTopicChange: (topic: string) => void
}

export function CanEducation({ topic, onTopicChange }: CanEducationProps) {
  return (
    <div className="workspace-grid">
      <aside className="curriculum panel">
        <div className="panel-heading"><LabIcon name="book" /><h2>LEARNING MODULES</h2></div>
        <div className="side-caption">หัวข้อการเรียนรู้</div>
        <nav aria-label="หัวข้อบทเรียน" className="topic-list">
          {educationTopics.map((label) => (
            <button key={label} className={topic === label ? 'topic selected' : 'topic'}
              aria-pressed={topic === label} onClick={() => onTopicChange(label)}>
              <span className="topic-marker" /><span>{label}</span><span className="chevron">›</span>
            </button>
          ))}
        </nav>
        <div className="curriculum-bottom"><LabIcon name="layers" /><div>LEARN. EXPLORE. UNDERSTAND.<small>CAN BUS • EV • VIRTUAL LAB</small></div></div>
      </aside>

      <section className="main-workspace panel" aria-labelledby="workspace-title">
        <div className="workspace-toolbar"><div className="panel-heading"><LabIcon name="book" /><h2 id="workspace-title">LESSON WORKSPACE</h2></div><span className="toolbar-caption">WORKSPACE</span></div>
        <div className="workspace-canvas">
          <div className="canvas-corner top-left" /><div className="canvas-corner top-right" />
          <div className="canvas-corner bottom-left" /><div className="canvas-corner bottom-right" />
          <div className="empty-workspace">
            <div className="workspace-emblem"><LabIcon name="book" /></div>
            <span className="eyebrow">CAN BUS LEARNING PLATFORM</span>
            <h3>{topic}</h3>
            <span className="empty-label">พื้นที่สำหรับเนื้อหาและสื่อการเรียนรู้</span>
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
  )
}
