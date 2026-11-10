import { Component, Suspense, useCallback, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { LabIcon } from '../../shared/icons/LabIcon'
import { MotorModel } from './MotorModel'
import { MOTOR_COMPONENT_COUNT, MOTOR_GROUPS, MOTOR_MODEL_PATH, isMotorPartVisible } from './motor-view-config'
import type { MotorGroupId, MotorSelection, MotorViewMode } from './motor-view-config'
import type { MotorPartInfo } from './motor-component-info'

const modelUrl = import.meta.env.BASE_URL + MOTOR_MODEL_PATH
const views: readonly { id: MotorViewMode; label: string; thai: string }[] = [
  { id: 'assembled', label: 'Assembled', thai: 'ประกอบครบ' },
  { id: 'cutaway', label: 'Cutaway', thai: 'เปิดดูภายใน' },
  { id: 'exploded', label: 'Exploded', thai: 'แยกชุดประกอบ' },
]

class ViewerBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: string | null }> {
  state: { error: string | null } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : 'เปิดโมเดลไม่สำเร็จ' }
  }
  render() {
    return this.state.error ? <div className="cp-glb-message" role="alert"><LabIcon name="layers" /><h3>เปิดโมเดลไม่สำเร็จ</h3><p>{this.state.error}</p><p>ตรวจไฟล์ GLB และการรองรับ WebGL ของเบราว์เซอร์</p><button onClick={this.props.onRetry}>ลองโหลดใหม่</button></div> : this.props.children
  }
}

function GlbFile({ onReload }: { onReload: () => void }) {
  const [mode, setMode] = useState<MotorViewMode>('assembled')
  const [extraDetail, setExtraDetail] = useState(false)
  const [hiddenGroups, setHiddenGroups] = useState<MotorGroupId[]>([])
  const [selection, setSelection] = useState<MotorSelection>(null)
  const [parts, setParts] = useState<readonly MotorPartInfo[]>([])
  const [resetKey, setResetKey] = useState(0)
  const onReady = useCallback((loadedParts: readonly MotorPartInfo[]) => setParts(loadedParts), [])
  const onSelect = useCallback((next: MotorSelection) => setSelection(next), [])
  const chooseMode = (next: MotorViewMode) => {
    setMode(next)
    setExtraDetail(false)
    setHiddenGroups([])
    setSelection(null)
    setResetKey((value) => value + 1)
  }
  const restoreVisibility = () => {
    setExtraDetail(false)
    setHiddenGroups([])
    setSelection(null)
  }
  const toggleGroup = (id: MotorGroupId) => {
    setHiddenGroups((hidden) => hidden.includes(id) ? hidden.filter((group) => group !== id) : [...hidden, id])
    setSelection(null)
  }

  const visibleParts = useMemo(() => parts.filter((part) =>
    part.initiallyVisible && isMotorPartVisible(part.name, part.group, mode, extraDetail, hiddenGroups)),
  [parts, mode, extraDetail, hiddenGroups])
  const visibleIds = useMemo(() => new Set(visibleParts.map((part) => part.id)), [visibleParts])
  const groups = useMemo(() => MOTOR_GROUPS.map((group) => {
    const members = parts.filter((part) => part.group === group.id)
    return {
      ...group, members,
      visible: members.filter((part) => visibleIds.has(part.id)).length,
      modeVisible: members.filter((part) => part.initiallyVisible && isMotorPartVisible(part.name, part.group, mode, extraDetail, [])).length,
    }
  }).filter((group) => group.members.length > 0), [parts, visibleIds, mode, extraDetail])
  const selectedPart = selection?.kind === 'part' ? parts.find((part) => part.id === selection.name) : undefined
  const selectedGroup = selection?.kind === 'group' ? groups.find((group) => group.id === selection.id) : undefined
  const modeLabel = views.find((view) => view.id === mode)?.label ?? mode
  const ready = parts.length > 0

  return (
    <>
      <div className="cp-center cp-motor-main">
        <section className="panel cp-viewer cp-motor-viewer">
          <div className="workspace-toolbar"><div className="panel-heading"><LabIcon name="vehicle" /><h2>IPMSM · MOTOR EXPLORER</h2></div><span className="cp-view-badge">INTERACTIVE 3D</span></div>
          <div className="cp-view-modes" role="group" aria-label="โหมดแสดงมอเตอร์">
            {views.map((view) => <button key={view.id} disabled={!ready} aria-pressed={mode === view.id} className={'cp-view-mode '+view.id+(mode === view.id ? ' active' : '')} onClick={() => chooseMode(view.id)}><i /><span>{view.label}<small>{view.thai}</small></span></button>)}
          </div>
          {mode === 'cutaway' && <div className="cp-isolation-option"><label><input type="checkbox" checked={extraDetail} onChange={(event) => { setExtraDetail(event.target.checked); setSelection(null) }} /> เปิดส่วนสเตเตอร์เพิ่ม / More internal detail</label><p>{extraDetail ? 'ซ่อน StatorAccessQuarter และ StatorLowerQuarter เพิ่ม โดยคง RotorCore ไว้ แม่เหล็กยังอยู่ภายในแกน ไม่แสดงลอยแยกออกมา' : 'เปิดตัวเรือนและฝาครอบตามรายชื่อเดิม ตำแหน่งภายในคงเดิม นี่คือการซ่อนชิ้นส่วน ไม่ใช่ Section cut'}</p></div>}
          <div className="cp-stage cp-stage-three cp-motor-stage">
            <ViewerBoundary onRetry={onReload}>
              <Canvas className="cp-three-canvas" frameloop="demand" dpr={[1, 1.5]}
                camera={{ position: [.3, .2, .45], fov: 38, near: .001, far: 20 }}
                onPointerMissed={(event) => { if (event.button === 0) setSelection(null) }}
                fallback={<div className="cp-glb-message"><h3>เบราว์เซอร์นี้เปิด WebGL ไม่ได้</h3><p>ยังดู SVG หรือโมเดลเดิมในช่อง ELECTRIC MOTOR ได้</p></div>}
                aria-label="มอเตอร์ IPMSM 3D คลิกชิ้นส่วนเพื่อดูข้อมูล หรือเลือกรายการผ่าน Component Legend">
                <color attach="background" args={['#0b111b']} />
                <ambientLight intensity={.85} />
                <hemisphereLight args={['#ffffff', '#5a6472', 1.5]} />
                <directionalLight position={[2, 3, 4]} intensity={2.1} />
                <directionalLight position={[-3, 1, -2]} intensity={1.4} color="#edf3ff" />
                <Suspense fallback={<Html center><span className="cp-loading-label" role="status">กำลังโหลดโมเดล GLB…</span></Html>}>
                  <MotorModel mode={mode} extraDetail={extraDetail} hiddenGroups={hiddenGroups} selection={selection}
                    resetKey={resetKey} onReady={onReady} onSelect={onSelect} />
                </Suspense>
              </Canvas>
            </ViewerBoundary>
            {ready && <div className="cp-motor-status"><span className={'cp-mode-dot '+mode} />{modeLabel}<span>{visibleParts.length} / {parts.length} ชิ้นเปิดแสดง</span></div>}
            {ready && visibleParts.length === 0 && <div className="cp-all-hidden"><p>ทุกกลุ่มถูกซ่อน</p><button onClick={restoreVisibility}>คืนค่า Visibility</button></div>}
            <div className="cp-stage-footer"><span>ลาก = หมุน · ล้อเมาส์ = ซูม · คลิก = เลือก</span><span>Y UP · METRES</span></div>
          </div>
          <div className="cp-display-controls cp-motor-toolbar"><div><button disabled={!ready} onClick={() => setResetKey((value) => value + 1)}>↺ Reset view</button><button disabled={!selection} onClick={() => setSelection(null)}>Clear selection</button></div><button onClick={onReload}>Reload file</button></div>
        </section>

        <section className="panel cp-motor-legend">
          <div className="cp-legend-heading"><div className="panel-heading"><LabIcon name="layers" /><h2>COMPONENT LEGEND</h2></div><button disabled={!ready} onClick={restoreVisibility}>Restore mode visibility</button></div>
          <p>เลือกชื่อกลุ่มเพื่อ Highlight · ช่องเลือกใช้ซ่อน/แสดงเพิ่มเติมจากโหมดปัจจุบัน</p>
          {!ready ? <p>รายการกลุ่มจะแสดงหลังอ่าน Node จาก GLB สำเร็จ</p> : <div className="cp-legend-list">{groups.map((group) => (
            <div className={'cp-legend-row '+(selectedGroup?.id === group.id ? 'active' : selectedPart?.group === group.id ? 'contains-selection' : '')} key={group.id} style={{ '--group-color': group.color } as CSSProperties}>
              <button className="cp-legend-select" disabled={group.visible === 0} aria-pressed={selectedGroup?.id === group.id}
                onClick={() => setSelection({ kind: 'group', id: group.id })}><i /><span>{group.label}<small>{group.thai}</small></span><strong>{group.visible}/{group.members.length}</strong></button>
              <label className="cp-legend-visibility"><input type="checkbox" disabled={group.modeVisible === 0} checked={group.modeVisible > 0 && !hiddenGroups.includes(group.id)}
                onChange={() => toggleGroup(group.id)} aria-label={'แสดงกลุ่ม '+group.label} /><span>{group.modeVisible === 0 ? 'ซ่อนโดยโหมด' : 'Show'}</span></label>
            </div>
          ))}</div>}
          <details className="cp-part-picker"><summary>เลือกชิ้นส่วนรายชิ้น / Select a part</summary><label htmlFor="motor-part-picker">ชื่อ Node จากโมเดล</label><select id="motor-part-picker" value={selectedPart?.id ?? ''} disabled={!ready} onChange={(event) => setSelection(event.target.value ? { kind: 'part', name: event.target.value } : null)}>
            <option value="">เลือกชิ้นส่วน…</option>{groups.map((group) => <optgroup key={group.id} label={group.label}>{group.members.map((part) => <option key={part.id} value={part.id} disabled={!visibleIds.has(part.id)}>{part.name}{visibleIds.has(part.id) ? '' : ' — ซ่อนอยู่'}</option>)}</optgroup>)}
          </select><p>รายการใช้เลือกชิ้นส่วนที่อยู่ด้านในหรือคลิกยาก ชิ้นที่ซ่อนตามโหมดจะยังเลือกไม่ได้</p></details>
        </section>
        <section className="cp-selected-note" aria-live="polite"><span>{modeLabel.toUpperCase()} · {ready ? visibleParts.length+' / '+parts.length+' PARTS' : 'LOADING MODEL'}</span><strong>{selectedPart ? selectedPart.name : selectedGroup ? selectedGroup.label : 'สำรวจโครงสร้างมอเตอร์ EV'}</strong><p>{mode === 'assembled' ? 'ตำแหน่งประกอบเดิมครบทุกชิ้นเมื่อไม่มีการซ่อนกลุ่มเพิ่มเติม' : mode === 'cutaway' ? 'ชิ้นส่วนภายในคงตำแหน่งเดิม แม่เหล็กบางส่วนถูกบังตามโครงสร้างจริง' : 'ระยะ Exploded แบบกระชับสำหรับการสอน ไม่ใช่เส้นทางถอดประกอบที่ตรวจสอบแล้ว'} · สลับโหมดเพื่อล้างการเลือกและ Visibility เพิ่มเติม</p></section>
      </div>

      <aside className="cp-details cp-motor-inspector">
        <section className="panel cp-motor-inspection" aria-live="polite">
          <div className="panel-heading"><LabIcon name="code" /><h2>COMPONENT INSPECTOR</h2></div>
          {selectedPart ? <>
            <span className="cp-inspector-type">SELECTED PART</span><h3>{selectedPart.name}</h3>
            {selectedPart.thai && <p className="cp-inspector-thai">{selectedPart.thai}</p>}
            <dl><dt>Group / กลุ่ม</dt><dd>{groups.find((group) => group.id === selectedPart.group)?.label ?? 'Other components'}</dd><dt>Function / หน้าที่</dt><dd>{selectedPart.purpose}</dd><dt>Material / วัสดุ</dt><dd>{selectedPart.material ?? 'ไม่มีข้อมูลวัสดุทางวิศวกรรมที่ยืนยันในไฟล์'}</dd><dt>GLB appearance</dt><dd>{selectedPart.appearance}<small>ชื่อผิวในไฟล์ ไม่ใช่การรับรองชนิดโลหะ เกรด หรือคุณสมบัติ</small></dd><dt>Loaded Node</dt><dd><code>{selectedPart.id}</code></dd></dl>
            <button onClick={() => setSelection(null)}>Clear selection / ล้างการเลือก</button>
          </> : selectedGroup ? <>
            <span className="cp-inspector-type">SELECTED GROUP</span><h3>{selectedGroup.label}</h3><p className="cp-inspector-thai">{selectedGroup.thai}</p><p>{selectedGroup.description}</p><div className="cp-group-count"><strong>{selectedGroup.visible}</strong> / {selectedGroup.members.length} ชิ้นเปิดแสดง</div><p>เลือกชิ้นส่วนใน Viewer หรือรายการย่อยเพื่อดูหน้าที่เฉพาะชิ้น</p><button onClick={() => setSelection(null)}>Clear selection / ล้างการเลือก</button>
          </> : <div className="cp-inspector-empty"><LabIcon name="tool" /><h3>เลือกชิ้นส่วนเพื่อเริ่มสำรวจ</h3><p>คลิกโมเดล หรือเลือกกลุ่มใน Legend ข้อมูลและ Highlight จะแสดงเฉพาะสิ่งที่เลือก</p><span>{ready ? parts.length : MOTOR_COMPONENT_COUNT} COMPONENTS · ORIGINAL GLB</span></div>}
        </section>
        <section className="panel cp-motor-guide"><div className="panel-heading"><LabIcon name="book" /><h2>VIEW GUIDE</h2></div><ul><li><strong>Assembled</strong>โครงสร้างครบและสัมพันธ์กันตามไฟล์เดิม</li><li><strong>Cutaway</strong>เปิดดูภายในโดยซ่อนชิ้นที่กำหนด ไม่มี Boolean หรือผิวปิดหน้าตัด</li><li><strong>Exploded</strong>แยกชุดให้ดูง่าย แม่เหล็กยังอยู่กับ Rotor</li></ul><p>Reset view คืนกล้องเท่านั้น · Restore mode visibility คืนรายการซ่อนของโหมด · กด Assembled เพื่อคืนภาพประกอบครบ</p></section>
        <details className="panel cp-motor-source"><summary>Model & coordinate reference</summary><p>GLB เดิม 63 ชิ้น · X ตามแนวมอเตอร์ · Y ขึ้น · หน่วยเมตร<br />ชื่อ Node และ geometry ไม่เปลี่ยน</p><code>motorglb/ev-ipmsm-motor.glb</code><p>โมเดลสาธิต ไม่ใช่มอเตอร์รุ่นผลิตที่ผ่านการรับรอง และยังไม่เชื่อม CAN engine</p></details>
      </aside>
    </>
  )
}

export default function MotorGlbPreview() {
  const [attempt, setAttempt] = useState(0)
  const reload = () => { useGLTF.clear(modelUrl); setAttempt((value) => value + 1) }
  return <GlbFile key={attempt} onReload={reload} />
}
