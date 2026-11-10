import { useState } from 'react'
import type { CSSProperties } from 'react'
import { lazy, Suspense } from 'react'
import { LabIcon } from '../shared/icons/LabIcon'
import { ComponentDiagram } from './diagrams/ComponentDiagram'
import { labParts } from './data/parts'
import type { ComponentId } from './data/parts'
import './styles/component-lab.css'

const Motor3D = lazy(() => import('./motor-procedural/Motor3D'))
const MotorGlbPreview = lazy(() => import('./motor-glb/MotorGlbPreview'))

export function EvComponentLab() {
  const [selected, setSelected] = useState<ComponentId | 'motor-glb'>('motor')
  const [layer, setLayer] = useState(1)
  const [exploded, setExploded] = useState(true)
  const [labels, setLabels] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [answer, setAnswer] = useState(false)
  const [motorView, setMotorView] = useState<'3d' | 'diagram'>('3d')
  const [spinning, setSpinning] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const isMotor3D = selected === 'motor' && motorView === '3d'
  const part = labParts.find((item) => item.id === selected) ?? labParts[0]!
  const activeLayer = part.layers[layer]!
  const choose = (id: ComponentId | 'motor-glb') => { setSelected(id); setLayer(1); setAnswer(false); setZoom(1); setSpinning(false) }
  const resetView = () => { setLayer(1); setExploded(true); setLabels(true); setZoom(1); setSpinning(false); setResetKey((value)=>value+1) }
  const schematic = <div className="cp-diagram-container"><div style={{transform:'scale('+zoom+')'}} className="cp-zoom-content"><ComponentDiagram part={part} exploded={exploded} labels={labels} layer={layer} onLayer={setLayer} /></div></div>
  const fallback = <div className="cp-three-fallback"><p>เปิด 3D ไม่สำเร็จ — แสดงภาพ SVG สำรอง กด Reset view เพื่อลองใหม่</p>{schematic}</div>

  return (
    <div className="cp-lab" style={{'--cp-accent':selected==='motor-glb'?'#8cbae9':part.color} as CSSProperties}>
      <aside className="panel cp-catalog">
        <div className="panel-heading"><LabIcon name="tool" /><h2>COMPONENT LIBRARY</h2></div>
        <p className="cp-caption">เลือกชิ้นส่วนเพื่อเริ่มสำรวจ</p>
        <nav aria-label="ชิ้นส่วน EV">{labParts.map((item,index)=><button key={item.id} className={selected===item.id?'cp-part active':'cp-part'} aria-pressed={selected===item.id} onClick={()=>choose(item.id)}>
          <span className="cp-part-symbol" style={{color:item.color}}><LabIcon name={item.id==='can'?'activity':item.id==='motor'?'tool':'layers'} /></span>
          <span><strong>{item.label}</strong><small>{item.thai}</small></span><span className="cp-part-number">{String(index+1).padStart(2,'0')}</span>
        </button>)}
          <button className={selected==='motor-glb'?'cp-part active':'cp-part'} aria-pressed={selected==='motor-glb'} onClick={()=>choose('motor-glb')}>
            <span className="cp-part-symbol" style={{color:'#8cbae9'}}><LabIcon name="vehicle" /></span>
            <span><strong>MOTOR · GLB FILE</strong><small>มอเตอร์จากไฟล์ · เปรียบเทียบ</small></span><span className="cp-part-number">07</span>
          </button>
        </nav>
        <div className="cp-library-note"><span className="eyebrow">TEACHING COLLECTION</span><p>สำรวจชิ้นส่วน → เข้าใจหน้าที่<br />→ เชื่อมโยงสัญญาณ CAN</p><span>GENERIC EV · SYNTHETIC NETWORK</span></div>
      </aside>

      {selected === 'motor-glb' ? <Suspense fallback={<div className="panel cp-glb-loading" role="status">กำลังเปิดช่องโมเดล GLB…</div>}><MotorGlbPreview /></Suspense> : <>
      <div className="cp-center">
        <section className="panel cp-viewer">
          <div className="workspace-toolbar"><div className="panel-heading"><LabIcon name="layers" /><h2>COMPONENT EXPLORER</h2></div><span className="cp-view-badge">{isMotor3D ? 'INTERACTIVE 3D DEMO' : 'SCHEMATIC VIEW'}</span></div>
          <div className={'cp-stage '+(isMotor3D?'cp-stage-three':'')}>
            <div className="cp-stage-heading"><span>{part.category}</span><h2>{part.label}</h2><p>{part.thai}</p></div>
            <div className="cp-zoom-controls" aria-label="ขยายภาพ"><button aria-label="ย่อภาพ" disabled={zoom<=.8} onClick={()=>setZoom((value)=>Math.max(.8,value-.2))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="ขยายภาพ" disabled={zoom>=1.6} onClick={()=>setZoom((value)=>Math.min(1.6,value+.2))}>+</button></div>
            {isMotor3D ? <Suspense fallback={<div className="cp-three-loading" role="status">กำลังโหลดพื้นที่ 3D…</div>}><Motor3D exploded={exploded} labels={labels} layer={layer} zoom={zoom} spinning={spinning} resetKey={resetKey} onLayer={setLayer} fallback={fallback} /></Suspense> : schematic}
            <div className="cp-stage-footer"><span>{isMotor3D?'ลาก = หมุน · ล้อเมาส์ = ซูม · คลิก = เลือกชิ้นส่วน':'เลือกชั้นในภาพ หรือรายการด้านล่าง'}</span><span>{isMotor3D?'GENERIC MOTOR · NOT TO SCALE':'SVG CONCEPT · NOT A 3D MODEL'}</span></div>
          </div>
          {selected==='motor' && <div className="cp-motor-controls"><div role="group" aria-label="รูปแบบภาพมอเตอร์"><button aria-pressed={motorView==='3d'} className={motorView==='3d'?'active':''} onClick={()=>setMotorView('3d')}>3D model</button><button aria-pressed={motorView==='diagram'} className={motorView==='diagram'?'active':''} onClick={()=>{setMotorView('diagram');setSpinning(false)}}>SVG diagram</button></div><button disabled={!isMotor3D} aria-pressed={spinning} onClick={()=>setSpinning(!spinning)}>{spinning?'Ⅱ หยุด Rotor':'▶ หมุน Rotor'}</button><small>แอนิเมชันเพื่อสาธิต ไม่ใช่ค่า RPM จำลอง</small></div>}
          <div className="cp-display-controls"><div><button className={exploded?'active':''} aria-pressed={exploded} onClick={()=>setExploded(!exploded)}>{exploded?'▤':'▣'} {exploded?'Exploded view':'Assembled view'}</button><button className={labels?'active':''} aria-pressed={labels} onClick={()=>setLabels(!labels)}>Layer markers</button></div><button onClick={resetView}>↺ Reset view</button></div>
        </section>

        <section className="panel cp-layer-panel"><div className="panel-heading"><LabIcon name="code" /><h2>PART BREAKDOWN</h2></div><div className="cp-layer-list">{part.layers.map((item,index)=><button key={item.name} className={layer===index?'active':''} aria-pressed={layer===index} onClick={()=>setLayer(index)}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{item.name}</strong><small>{item.note}</small></div><span>↗</span></button>)}</div></section>
        <section className="cp-selected-note" aria-live="polite"><span>SELECTED PART</span><strong>{activeLayer.name}</strong><p>{activeLayer.note}</p></section>
      </div>

      <aside className="cp-details">
        <section className="panel cp-purpose"><div className="panel-heading"><LabIcon name="book" /><h2>FUNCTION & PURPOSE</h2></div><h3>{part.thai}</h3><p>{part.summary}</p></section>
        <section className="panel cp-connections"><div className="panel-heading"><LabIcon name="layers" /><h2>SYSTEM CONNECTIONS</h2></div><ul>{part.connections.map((connection)=><li key={connection}>{connection}</li>)}</ul></section>
        <section className="panel cp-signals"><div className="panel-heading"><LabIcon name="activity" /><h2>CAN LEARNING LINK</h2></div><ul>{part.signals.map((signal)=><li key={signal}>{signal}</li>)}</ul><span className="cp-reference-tag">APITECH SYNTHETIC TRAINING MAP</span></section>
        <section className="panel cp-teacher"><div className="panel-heading"><LabIcon name="instructor" /><h2>TEACHING PROMPT</h2></div><p>{part.question}</p><button aria-expanded={answer} aria-controls="cp-answer" onClick={()=>setAnswer(!answer)}>{answer?'ซ่อนแนวคำตอบ −':'แสดงแนวคำตอบ +'}</button>{answer&&<div id="cp-answer" className="cp-answer">{part.answer}</div>}</section>
      </aside>
      </>}
    </div>
  )
}
