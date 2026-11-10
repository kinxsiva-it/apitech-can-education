import { useState } from 'react'
import { LabIcon } from '../shared/icons/LabIcon'

const parts = [
  { id: 'battery', label: 'Battery pack', thai: 'ชุดแบตเตอรี่', color: '#71c6a3' },
  { id: 'inverter', label: 'Motor controller', thai: 'อินเวอร์เตอร์', color: '#64b7e4' },
  { id: 'motor', label: 'Electric motor', thai: 'มอเตอร์ไฟฟ้า', color: '#ff9159' },
  { id: 'vcu', label: 'Vehicle control unit', thai: 'ชุดควบคุม VCU', color: '#ba9ae4' },
] as const

export function EvSystemExplorer() {
  const [selected, setSelected] = useState<string>('motor')
  const [view, setView] = useState('Overview')
  const [showCan, setShowCan] = useState(true)
  const [showPower, setShowPower] = useState(true)
  const [cutaway, setCutaway] = useState(true)
  const part = parts.find((item) => item.id === selected) ?? parts[2]
  const reset = () => { setSelected('motor'); setView('Overview'); setShowCan(true); setShowPower(true); setCutaway(true) }

  return (
    <div className="ev-layout">
      <div className="ev-visual-column">
        <section className="panel ev-stage-panel">
          <div className="workspace-toolbar"><div className="panel-heading"><LabIcon name="vehicle" /><h2>EV POWERTRAIN · SYSTEM EXPLORER</h2></div><span className="ev-blue-label">MOTION & ENERGY</span></div>
          <div className="ev-stage">
            <div className="ev-stage-legend"><span className="eyebrow">EV SYSTEM / CONCEPT CUTAWAY</span>{parts.map((item) => <button key={item.id} aria-pressed={selected === item.id} className={selected === item.id ? 'chosen' : ''} onClick={() => setSelected(item.id)}><i style={{ background: item.color }} />{item.label}</button>)}</div>
            <div className="ev-view-buttons"><span>VIEW PRESET</span>{['Overview', 'Side view', 'Top view'].map((label) => <button key={label} aria-pressed={view === label} className={view === label ? 'chosen' : ''} onClick={() => setView(label)}>{label}</button>)}</div>
            <div className={'ev-diagram view-' + view.split(' ')[0]?.toLowerCase()}>
              <svg viewBox="0 0 900 520" role="img" aria-labelledby="ev-diagram-title">
                <title id="ev-diagram-title">ภาพแนวคิดชุดขับเคลื่อน EV: Battery, Inverter, Motor และ VCU</title>
                <defs>
                  <linearGradient id="ev-metal" x2="0.7" y2="1"><stop stopColor="#697382" /><stop offset=".45" stopColor="#272e3a" /><stop offset="1" stopColor="#10151d" /></linearGradient>
                  <linearGradient id="ev-copper"><stop stopColor="#e6a269" /><stop offset=".5" stopColor="#a45029" /><stop offset="1" stopColor="#f0b67f" /></linearGradient>
                  <pattern id="ev-floor" width="50" height="30" patternUnits="userSpaceOnUse"><path d="M50 0H0V30" fill="none" stroke="#65758c" strokeOpacity=".13" /></pattern>
                </defs>
                <g className="ev-model">
                  <ellipse cx="470" cy="365" rx="345" ry="65" fill="#000" opacity=".4" />
                  <path d="M70 330 470 165 865 330 465 495Z" fill="url(#ev-floor)" stroke="#68788c" strokeOpacity=".15" />
                  <path d="m135 316 330-127 305 113-330 147Z" fill="none" stroke="#475268" strokeWidth="13" />
                  <path d="m135 316 330-127 305 113M135 316v17l305 130 330-147v-14" fill="none" stroke="#788290" strokeOpacity=".3" strokeWidth="2" />

                  {showPower && <g fill="none" stroke="#ed8751" strokeWidth="5" strokeLinejoin="round"><path d="m325 306 80-35 78 32 71-29" /><path d="m375 332 32-15 82 31 100-46" /><path d="m622 307 61 25 61-26" /></g>}
                  {showCan && <g fill="none" stroke="#54a7d0" strokeWidth="2" strokeDasharray="6 5"><path d="m290 260 105-67 142 54 122-38 99 39" /><path d="m537 247-24 62m146-100-4 68" /></g>}

                  <g opacity={selected === 'battery' ? 1 : .8}>
                    <path d="m155 289 151-61 142 56-147 65Z" fill="#3b695e" stroke="#71c6a3" strokeOpacity=".6" />
                    <path d="m155 289 146 60v43l-146-62Z" fill="#1d332f" stroke="#71c6a3" strokeOpacity=".35" />
                    <path d="m301 349 147-65v44l-147 64Z" fill="#142622" stroke="#71c6a3" strokeOpacity=".4" />
                    {cutaway && Array.from({length: 6}, (_, i) => <path key={i} d={'m' + (174 + i*21) + ' ' + (290+i*8) + ' 126-51 15 6-126 52Z'} fill="#77ab90" stroke="#101d19" strokeWidth="3" />)}
                    <path d="m166 318 116 49m-99-60 99 40" stroke="#88ccb2" strokeOpacity=".25" />
                    <text x="218" y="338" fill="#b3dbcb" fontSize="12" transform="rotate(23 218 338)">BATTERY PACK</text>
                  </g>

                  <g opacity={selected === 'inverter' ? 1 : .8}>
                    <path d="m445 269 78-32 80 31-79 36Z" fill="#64798b" stroke="#94bad4" strokeOpacity=".7" />
                    <path d="m445 269 79 35v55l-79-34Z" fill="#293e50" stroke="#67afda" strokeOpacity=".5" />
                    <path d="m524 304 79-36v55l-79 36Z" fill="#1a2c3c" stroke="#67afda" strokeOpacity=".5" />
                    {Array.from({length: 7}, (_, i) => <path key={i} d={'m' + (456+i*9) + ' ' + (268+i*4) + ' 65-27'} stroke="#b4c2cc" strokeWidth="3" opacity=".55" />)}
                  </g>

                  <g opacity={selected === 'motor' ? 1 : .8}>
                    <path d="m614 283 47-27 82 36-47 29Z" fill="url(#ev-metal)" stroke="#929ca7" strokeOpacity=".6" />
                    <path d="M614 283v54l82 38v-54Z" fill="#2f3642" stroke="#6b7483" />
                    <ellipse cx="699" cy="330" rx="47" ry="53" fill="url(#ev-metal)" stroke="#8993a0" strokeWidth="3" />
                    <ellipse cx="699" cy="330" rx="35" ry="41" fill="#111821" stroke="#a2613b" strokeWidth="5" />
                    {cutaway && Array.from({length: 12}, (_, i) => <rect key={i} x="693" y="291" width="12" height="18" rx="2" fill="url(#ev-copper)" transform={'rotate(' + i*30 + ' 699 330)'} />)}
                    <ellipse cx="699" cy="330" rx="18" ry="23" fill="#5f6c7b" stroke="#a0acbb" strokeWidth="2" />
                    <path d="m699 330 78 33" stroke="#9ca8b7" strokeWidth="15" /><ellipse cx="777" cy="363" rx="8" ry="10" fill="#454f5e" stroke="#b4bdc9" />
                    <path d="M632 292v39m12-33v38m-24-51v39" stroke="#748093" strokeWidth="2" />
                  </g>

                  <g opacity={selected === 'vcu' ? 1 : .8}><path d="m584 199 63-24 65 25-62 27Z" fill="#554a70" stroke="#b59bd8" /><path d="m584 199 66 28v25l-66-28Zm66 28 62-27v25l-62 27Z" fill="#292339" stroke="#8f78b4" /><text x="627" y="209" fontSize="13" fill="#dbccf2">VCU</text></g>

                  <g fill="none" stroke="#9ba9be" strokeOpacity=".5"><path d="m288 358-38 63h-90" /><path d="m520 320 6 98h64" /><path d="m708 284 35-92h64" /></g>
                  <g fontFamily="monospace" fontSize="11"><text x="110" y="442" fill="#8fc7ae">BATTERY / BMS</text><text x="531" y="436" fill="#8dc6e5">INVERTER</text><text x="733" y="182" fill="#ed9e72">MOTOR CUTAWAY</text></g>
                </g>
              </svg>
            </div>
            <div className="ev-stage-bottom"><span><i className="power-key" /> POWER PATH <i className="can-key" /> CAN NETWORK</span><span>SCHEMATIC VIEW · UI PREVIEW</span></div>
          </div>
        </section>

        <div className="ev-controls">
          <section className="panel ev-control-group"><h3>DISPLAY LAYERS</h3><div className="ev-button-row"><button className={showPower ? 'chosen' : ''} aria-pressed={showPower} onClick={() => setShowPower(!showPower)}>Power path</button><button className={showCan ? 'chosen blue' : ''} aria-pressed={showCan} onClick={() => setShowCan(!showCan)}>CAN network</button><button className={cutaway ? 'chosen' : ''} aria-pressed={cutaway} onClick={() => setCutaway(!cutaway)}>Cutaway</button></div></section>
          <section className="panel ev-control-group"><h3>PLAYBACK CONTROL</h3><div className="ev-button-row"><button disabled>◀ Step</button><button disabled>▶ Play</button><button disabled>Step ▶</button><button onClick={reset}>Reset view</button></div><small>เตรียมเชื่อม simulation engine</small></section>
        </div>
        <section className="panel ev-input-preview"><div className="panel-heading"><LabIcon name="tool" /><h2>VEHICLE INPUTS</h2></div><div className="ev-input-grid"><label>IGNITION<button disabled className="ev-input-empty">—</button></label><label>THROTTLE<span className="ev-slider-placeholder" /></label><label>BRAKE<button disabled className="ev-input-empty">—</button></label><label>BATTERY SOC<span className="ev-slider-placeholder" /></label></div></section>
      </div>

      <aside className="ev-info-column">
        <section className="panel ev-component-card"><div className="eyebrow">COMPONENT INSPECTOR</div><h2 style={{color:part.color}}>{part.label}</h2><span>{part.thai}</span><div className="ev-component-divider" /><div className="ev-button-row">{parts.map((item) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} className={selected === item.id ? 'chosen' : ''}>{item.id.toUpperCase()}</button>)}</div></section>
        <div className="ev-telemetry-grid">{[['MOTOR SPEED', 'RPM'], ['BATTERY SOC', '%'], ['PACK VOLTAGE', 'V'], ['MOTOR TEMPERATURE', '°C']].map(([label, unit]) => <section key={label} className="panel ev-metric"><h3>{label}</h3><div>— <small>{unit}</small></div><span className="ev-metric-line" /></section>)}</div>
        <section className="panel ev-signal-card"><div className="panel-heading"><LabIcon name="activity" /><h2>CAN SIGNALS</h2></div>{['VCU · Driver inputs', 'BMS · Battery status', 'MOTOR · Motor status'].map((label) => <div className="ev-signal-row" key={label}><span>{label}</span><span>—</span></div>)}<small>พื้นที่แสดงสัญญาณจาก CAN Bus</small></section>
        <section className="panel ev-learning-card"><div className="panel-heading"><LabIcon name="book" /><h2>EV SYSTEM NOTES</h2></div><h3>พลังงาน · การควบคุม · การสื่อสาร</h3><div className="blank-line" /><div className="blank-line short" /><span>ภาพประกอบโครงสร้างระบบสำหรับการเรียนรู้<br />ยังไม่แสดงผลการจำลอง</span></section>
      </aside>
    </div>
  )
}
