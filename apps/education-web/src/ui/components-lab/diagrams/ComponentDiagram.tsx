import type { ComponentId, LabPart } from '../data/parts'

interface DiagramProps {
  part: LabPart
  exploded: boolean
  labels: boolean
  layer: number
  onLayer: (index: number) => void
}

export function ComponentDiagram({ part, exploded, labels, layer, onLayer }: DiagramProps) {
  const gap = exploded ? 86 : 23
  const metal = 'url(#component-metal)'
  const body = (id: ComponentId, index: number) => {
    if (id === 'motor') {
      if (index === 1) return <g><path d="M240 0h175" stroke="#8a99ac" strokeWidth="21" /><ellipse cx="320" cy="0" rx="57" ry="39" fill={metal} stroke={part.color} strokeWidth="3" /><ellipse cx="320" cy="0" rx="23" ry="17" fill="#253544" /><path d="M245 0h150" stroke="#bcc5d0" strokeWidth="9" /></g>
      return <g><ellipse cx="320" cy="8" rx="108" ry="51" fill="#17212e" stroke="#76889c" strokeWidth="3" /><ellipse cx="320" cy="-3" rx="108" ry="51" fill={index === 0 ? metal : '#243343'} stroke="#a3aebd" strokeWidth="2" /><ellipse cx="320" cy="-3" rx={index === 0 ? 19 : 72} ry={index === 0 ? 12 : 34} fill="#0b121b" stroke={part.color} strokeWidth={index === 0 ? 3 : 12} />{index === 2 && Array.from({length:10},(_,i)=><rect key={i} x={240+i*16} y="-24" width="8" height="43" rx="3" fill="#b77e50" opacity=".6" />)}</g>
    }
    if (id === 'can') {
      if (index === 1) return <g fill="none" strokeWidth="5"><path d="M150-5h340" stroke="#6fb5df" /><path d="M150 12h340" stroke="#8c93e0" /><path d="M210-5v-27m110 27v-27m110 27v-27" stroke="#6fb5df" /></g>
      if (index === 2) return <g fill="#17232f" stroke={part.color}><rect x="145" y="-20" width="45" height="34" /><rect x="450" y="-20" width="45" height="34" /><path d="M167-34v14m0 34v14m306-62v14m0 34v14" strokeWidth="3" /></g>
      return <g>{['VCU','BMS','MOTOR'].map((name,i)=><g key={name}><rect x={175+i*110} y="-33" width="75" height="50" rx="3" fill={metal} stroke={part.color} /><text x={212+i*110} y="-3" textAnchor="middle" fill="#dbe5ef" fontSize="11">{name}</text></g>)}</g>
    }
    return <g>
      <path d="m185-18 133-52 145 55-133 59Z" fill={index === 0 ? metal : '#243849'} stroke="#8795a8" strokeWidth="2" />
      <path d="m185-18 145 62v22L185 3Z" fill="#263341" stroke="#60788b" /><path d="m330 44 133-59V7L330 66Z" fill="#14222e" stroke="#60788b" />
      {index === 1 && (id === 'battery'
        ? Array.from({length:6},(_,i)=><path key={i} d={'m'+(203+i*21)+' '+(-15+i*9)+' 106-42 15 6-106 43Z'} fill={part.color} opacity=".7" stroke="#172e28" strokeWidth="2" />)
        : <g><path d="m213-13 101-38 116 42-100 47Z" fill="#254b40" stroke={part.color} /><path d="m269-10 47-18 48 18-47 20Z" fill="#111c26" stroke="#92a9b0" /><path d="m223-2 34 14m90-37 45 17m-88 25 12-5m13-5 12-5" stroke="#c2ac72" strokeWidth="3" /></g>)}
      {index === 2 && Array.from({length:7},(_,i)=><path key={i} d={'m'+(203+i*17)+' '+(-14+i*7)+' 110-43'} stroke={part.color} strokeOpacity=".28" strokeWidth="3" />)}
      <g fill="#a5b0be"><circle cx="201" cy="-17" r="4" /><circle cx="318" cy="-59" r="4" /><circle cx="443" cy="-14" r="4" /><circle cx="330" cy="34" r="4" /></g>
    </g>
  }

  return (
    <svg className="cp-diagram" viewBox="0 0 640 480" role="img" aria-label={part.thai + ' ภาพแยกส่วนแบบ schematic'}>
      <defs><linearGradient id="component-metal" x2=".8" y2="1"><stop stopColor="#a0acb9" /><stop offset=".4" stopColor="#465467" /><stop offset="1" stopColor="#202d3b" /></linearGradient><pattern id="component-grid" width="40" height="24" patternUnits="userSpaceOnUse"><path d="M40 0H0v24" fill="none" stroke="#7696b3" strokeOpacity=".12" /></pattern></defs>
      <ellipse cx="320" cy="365" rx="200" ry="46" fill="#000" opacity=".3" /><path d="m70 325 250-100 250 100-250 115Z" fill="url(#component-grid)" stroke="#69839c" strokeOpacity=".18" />
      {part.layers.map((item,index) => {
        const y = 290 + (index-1)*gap
        return <g key={item.name} className={'cp-diagram-layer '+(layer===index?'is-selected':'')} style={{transform:'translateY('+y+'px)'}} role="button" tabIndex={0} aria-label={item.name} aria-pressed={layer===index} onClick={()=>onLayer(index)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onLayer(index)}}}>
          <title>{item.name}</title>{body(part.id,index)}
          {labels && <g className="cp-svg-label"><path d="M440 0h37l16-13h100" fill="none" stroke={part.color} strokeOpacity=".55" /><text x="485" y="-24" fill={part.color} fontSize="10">{String(index+1).padStart(2,'0')}</text></g>}
        </g>
      })}
      <text x="320" y="454" textAnchor="middle" fill="#5f758e" fontSize="8" letterSpacing="2">CONCEPT ILLUSTRATION / NOT TO SCALE</text>
    </svg>
  )
}
