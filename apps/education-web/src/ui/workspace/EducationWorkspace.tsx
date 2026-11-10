import { useState } from 'react'
import { CanEducation } from '../education/CanEducation'
import { educationTopics } from '../education/topics'
import { workspaceSections } from './navigation'
import { LabIcon } from '../shared/icons/LabIcon'
import { EvSimulation } from '../ev-simulation/EvSimulation'
import { EvSystemExplorer } from '../ev-system-explorer/EvSystemExplorer'
import { EvComponentLab } from '../components-lab/EvComponentLab'

export function EducationWorkspace() {
  const [active, setActive] = useState<string>('education')
  const [topic, setTopic] = useState<string | undefined>(educationTopics[0])
  const current = workspaceSections.find((section) => section.id === active) ?? workspaceSections[0]

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
        {workspaceSections.map((section) => (
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

        {active === 'components' ? <EvComponentLab /> : active === 'explorer' ? <EvSystemExplorer /> : active === 'simulation' ? <EvSimulation onNavigate={(section) => setActive(section)} /> : active !== 'education' ? (
          <section className="panel menu-placeholder" aria-labelledby="menu-placeholder-title">
            <div className="panel-heading"><LabIcon name={current.icon} /><h2 id="menu-placeholder-title">{current.label}</h2></div>
            <div className="workspace-canvas">
              <div className="empty-workspace">
                <div className="workspace-emblem"><LabIcon name={current.icon} /></div>
                <h3>{current.label}</h3>
                <span className="empty-label">พื้นที่สำหรับรายละเอียดที่จะกำหนดในขั้นตอนถัดไป</span>
              </div>
            </div>
          </section>
        ) : <CanEducation topic={topic} onTopicChange={setTopic} />}
      </main>
      <footer className="lab-footer"><span><i /> APITECH CAN STUDIO</span><span>EDUCATION & SIMULATION PLATFORM</span><span>UI CONCEPT · NO SIMULATION DATA</span></footer>
    </div>
  )
}
