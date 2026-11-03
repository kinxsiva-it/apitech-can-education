import { useState } from 'react'
import { LabIcon } from '../shared/icons/LabIcon'

const scenarios = [
  { id: 'standby', title: 'Standby', thai: 'เตรียมพร้อมระบบ' },
  { id: 'drive', title: 'Normal drive', thai: 'ขับขี่ปกติ' },
  { id: 'acceleration', title: 'Acceleration', thai: 'เร่งความเร็ว' },
  { id: 'braking', title: 'Braking', thai: 'ชะลอและเบรก' },
]

const gauges = [
  { label: 'MOTOR SPEED', thai: 'ความเร็วรอบมอเตอร์', unit: 'RPM', color: '#ff9159' },
  { label: 'BATTERY SOC', thai: 'ระดับประจุแบตเตอรี่', unit: '%', color: '#71c6a3' },
  { label: 'PACK VOLTAGE', thai: 'แรงดันแบตเตอรี่', unit: 'V', color: '#64b7e4' },
  { label: 'PACK CURRENT', thai: 'กระแสแบตเตอรี่', unit: 'A', color: '#ba9ae4' },
  { label: 'MOTOR TEMPERATURE', thai: 'อุณหภูมิมอเตอร์', unit: '°C', color: '#e5ba6c' },
  { label: 'DRIVE STATUS', thai: 'สถานะชุดขับเคลื่อน', unit: '', color: '#8da5c4' },
]

export function EvSimulation({ onNavigate }: { onNavigate: (section: 'monitor' | 'decoder' | 'explorer') => void }) {
  // Local UI inputs only. The future engine adapter will own simulation behavior.
  const [ignition, setIgnition] = useState(false)
  const [brake, setBrake] = useState(false)
  const [throttle, setThrottle] = useState(0)
  const [soc, setSoc] = useState(80)
  const [scenario, setScenario] = useState('standby')
  const reset = () => { setIgnition(false); setBrake(false); setThrottle(0); setSoc(80); setScenario('standby') }

  return (
    <div className="sim-layout">
      <aside className="sim-controls-column">
        <section className="panel sim-control-panel">
          <div className="panel-heading"><LabIcon name="tool" /><h2>VEHICLE CONTROL</h2></div>
          <div className="sim-network-label"><span>VIRTUAL CAN NETWORK</span><span>EV TRAINING</span></div>
          <div className="sim-switch-row"><span>Ignition<small>สวิตช์ระบบรถ</small></span><button className={'sim-switch ' + (ignition ? 'on' : '')} role="switch" aria-checked={ignition} aria-label="Ignition" onClick={() => { setIgnition(!ignition); setThrottle(0) }}><i /><span>{ignition ? 'ON' : 'OFF'}</span></button></div>
          <div className="sim-switch-row"><span>Brake<small>แป้นเบรก</small></span><button className={'sim-switch ' + (brake ? 'on' : '')} role="switch" aria-checked={brake} aria-label="Brake" onClick={() => setBrake(!brake)}><i /><span>{brake ? 'ON' : 'OFF'}</span></button></div>
          <label className="sim-slider-label" htmlFor="ev-throttle"><span>THROTTLE<small>คันเร่ง</small></span><strong>{throttle}<small>%</small></strong></label>
          <input id="ev-throttle" className="sim-slider" type="range" min="0" max="100" value={throttle} disabled={!ignition} onChange={(event) => setThrottle(event.target.valueAsNumber)} />
          <div className="sim-range-captions"><span>RELEASE</span><span>FULL</span></div>
          <label className="sim-slider-label soc" htmlFor="ev-soc"><span>INITIAL BATTERY SOC<small>ประจุเริ่มต้น</small></span><strong>{soc}<small>%</small></strong></label>
          <input id="ev-soc" className="sim-slider green" type="range" min="0" max="100" value={soc} onChange={(event) => setSoc(event.target.valueAsNumber)} />
          <p className="sim-input-note">ปรับได้เฉพาะค่า input ของ UI<br />ยังไม่คำนวณค่ารถหรือสร้าง CAN frames</p>
        </section>
        <section className="panel sim-scenario-panel"><div className="panel-heading"><LabIcon name="layers" /><h2>DRIVE SCENARIOS</h2></div><div className="sim-scenarios">{scenarios.map((item) => <button key={item.id} aria-pressed={scenario === item.id} className={scenario === item.id ? 'selected' : ''} onClick={() => setScenario(item.id)}><i /><span>{item.title}<small>{item.thai}</small></span></button>)}</div><span className="sim-muted-note">เลือกสถานการณ์ไว้สำหรับพรีวิวหน้าจอ</span></section>
      </aside>

      <div className="sim-dashboard-column">
        <section className="panel sim-dashboard">
          <div className="workspace-toolbar"><div className="panel-heading"><LabIcon name="vehicle" /><h2>EV LIVE DASHBOARD</h2></div><span className="sim-waiting"><i /> AWAITING SIMULATION</span></div>
          <div className="sim-dashboard-top"><div><div className="eyebrow">VIRTUAL ELECTRIC VEHICLE</div><h2>DRIVER WORKSPACE</h2><p>หน้าปัดและสถานะระบบขับเคลื่อน</p></div><span className="sim-drive-badge">EV</span></div>
          <div className="sim-gauges">{gauges.map((gauge) => <div className="sim-gauge" key={gauge.label} style={{ borderTopColor: gauge.color + '66' }}><h3>{gauge.label}</h3><span className="sim-gauge-thai">{gauge.thai}</span><div className="sim-gauge-value" style={{color:gauge.color}}>— <small>{gauge.unit}</small></div><div className="sim-gauge-track"><i style={{background:gauge.color}} /></div></div>)}</div>
          <div className="sim-flow" aria-label="เส้นทางพลังงาน EV"><span>BATTERY</span><i>→</i><span>INVERTER</span><i>→</i><span>MOTOR</span><button onClick={() => onNavigate('explorer')} aria-label="สำรวจโครงสร้างระบบ EV">EXPLORE ↗</button></div>
          <div className="sim-playback"><div><span className="eyebrow">SIMULATION CLOCK</span><strong>— <small>SIM TIME</small></strong></div><div className="ev-button-row"><button disabled>▶ Start</button><button disabled>Ⅱ Pause</button><button onClick={reset}>↺ Reset inputs</button></div></div>
        </section>
        <section className="panel sim-trend-panel"><div className="panel-heading"><LabIcon name="activity" /><h2>SIGNAL TIMELINE</h2></div><div className="sim-chart-placeholder"><span>พื้นที่กราฟ RPM · SOC · VOLTAGE</span><div className="sim-chart-axis" /></div><div className="sim-chart-legend"><span>● MOTOR SPEED</span><span>● BATTERY SOC</span><span>● PACK VOLTAGE</span></div></section>
      </div>

      <aside className="sim-info-column">
        <section className="panel sim-status-panel"><div className="panel-heading"><LabIcon name="activity" /><h2>NETWORK STATUS</h2></div><div className="sim-status-empty"><i /><span>NOT CONNECTED<small>ยังไม่เชื่อม simulation engine</small></span></div>{['BUS STATE', 'FRAME RATE', 'BUS LOAD', 'ERROR COUNT'].map((label) => <div key={label} className="ev-signal-row"><span>{label}</span><span>—</span></div>)}</section>
        <section className="panel sim-ecu-panel"><div className="panel-heading"><LabIcon name="code" /><h2>VIRTUAL ECU NODES</h2></div>{[['VCU','Driver inputs'],['BMS','Battery status'],['MOTOR','Motor status']].map(([name,label]) => <div className="sim-ecu-node" key={name}><div className="sim-chip">{name}</div><div><strong>{name}</strong><small>{label}</small></div><span>—</span></div>)}</section>
        <section className="panel sim-frame-panel"><div className="panel-heading"><LabIcon name="layers" /><h2>CAN FRAME PREVIEW</h2></div><div className="sim-frame-empty"><LabIcon name="code" /><span>พื้นที่แสดงเฟรมล่าสุด</span></div><button className="sim-nav-link" onClick={() => onNavigate('monitor')}>Open CAN Monitor <span>↗</span></button><button className="sim-nav-link" onClick={() => onNavigate('decoder')}>Open Signal Decoder <span>↗</span></button></section>
      </aside>
    </div>
  )
}
