import { Component, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, Path, Shape } from 'three'

interface Motor3DProps {
  exploded: boolean
  labels: boolean
  layer: number
  zoom: number
  spinning: boolean
  resetKey: number
  onLayer: (index: number) => void
  fallback: ReactNode
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function annulus(outer: number, inner: number) {
  const shape = new Shape()
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const hole = new Path()
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

function MotorAssembly({ exploded, labels, layer, spinning, onLayer }: Omit<Motor3DProps, 'fallback' | 'zoom' | 'resetKey'>) {
  const cover = useRef<Group>(null)
  const rotor = useRef<Group>(null)
  const rotorSpin = useRef<Group>(null)
  const stator = useRef<Group>(null)
  const housingShape = useMemo(() => annulus(1.28, 1.06), [])
  const coverShape = useMemo(() => annulus(1.29, .22), [])
  const select = (index: number) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta <= 3) onLayer(index)
  }

  useFrame((_, delta) => {
    // Visual animation only. Not motor physics, simulated RPM or CAN state.
    const dt = Math.min(delta, .05)
    if (cover.current) cover.current.position.z = MathUtils.damp(cover.current.position.z, exploded ? 3.1 : 1.02, 7, dt)
    if (rotor.current) rotor.current.position.z = MathUtils.damp(rotor.current.position.z, exploded ? 1.5 : 0, 7, dt)
    if (stator.current) stator.current.position.z = MathUtils.damp(stator.current.position.z, exploded ? -.65 : 0, 7, dt)
    if (spinning && rotorSpin.current) rotorSpin.current.rotation.z += dt * .65
  })

  const material = (index: number, color: string, metalness = .65) =>
    <meshStandardMaterial color={color} metalness={metalness} roughness={.35}
      emissive={layer === index ? '#713519' : '#000000'} emissiveIntensity={layer === index ? .22 : 0} />

  return (
    <group rotation={[0, -.18, 0]}>
      <group ref={stator} onClick={select(2)}>
        <mesh position={[0,0,-.9]} castShadow receiveShadow>
          <extrudeGeometry args={[housingShape, { depth:1.8, bevelEnabled:true, bevelSegments:2, steps:1, bevelSize:.035, bevelThickness:.035, curveSegments:48 }]} />
          {material(2,'#66778b')}
        </mesh>
        {[-.84,-.55,-.26,.03,.32,.61,.9].map((z)=><mesh key={z} position={[0,0,z]} castShadow><torusGeometry args={[1.29,.035,8,64]} />{material(2,'#91a0b1')}</mesh>)}
        {Array.from({length:12},(_,index)=>{
          const angle=index/12*Math.PI*2
          return <group key={index} position={[Math.cos(angle)*.94,Math.sin(angle)*.94,0]} rotation={[0,0,angle]}>
            <mesh castShadow><boxGeometry args={[.2,.24,1.55]} />{material(2,'#c9834b',.8)}</mesh>
            {[-.66,-.44,-.22,0,.22,.44,.66].map((z)=><mesh key={z} position={[0,0,z]}><boxGeometry args={[.215,.255,.035]} />{material(2,'#e8ac6a',.7)}</mesh>)}
          </group>
        })}
        {[-.8,.8].map((x)=><mesh key={x} position={[x,-1.27,-.1]} castShadow><boxGeometry args={[.45,.3,1.4]} />{material(2,'#53677d')}</mesh>)}
        {labels && <Html position={[-1.4,1.5,-.6]} center distanceFactor={9}><button className={'cp-3d-label '+(layer===2?'active':'')} onClick={()=>onLayer(2)}>03 · STATOR / HOUSING</button></Html>}
      </group>

      <group ref={rotor} onClick={select(1)}>
        <group ref={rotorSpin}>
          <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.57,.57,1.5,40]} />{material(1,'#9aa6b4')}</mesh>
          {Array.from({length:8},(_,index)=>{
            const angle=index/8*Math.PI*2
            return <mesh key={index} position={[Math.cos(angle)*.57,Math.sin(angle)*.57,0]} rotation={[0,0,angle]} castShadow><boxGeometry args={[.065,.25,1.2]} />{material(1,index%2?'#63869c':'#cda587')}</mesh>
          })}
          <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.16,.16,3.1,24]} />{material(1,'#c2cad4',.85)}</mesh>
          <mesh position={[0,.14,1.1]} castShadow><boxGeometry args={[.09,.08,.45]} />{material(1,'#b4c1d0')}</mesh>
        </group>
        {labels && <Html position={[.2,-1.25,.6]} center distanceFactor={9}><button className={'cp-3d-label '+(layer===1?'active':'')} onClick={()=>onLayer(1)}>02 · ROTOR / SHAFT</button></Html>}
      </group>

      <group ref={cover} onClick={select(0)}>
        <mesh position={[0,0,-.09]} castShadow><extrudeGeometry args={[coverShape,{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.025,curveSegments:48}]} />{material(0,'#8293a6')}</mesh>
        <mesh><torusGeometry args={[.3,.09,12,40]} />{material(0,'#bfc9d6',.85)}</mesh>
        {Array.from({length:6},(_,index)=>{
          const angle=index/6*Math.PI*2
          return <mesh key={index} position={[Math.cos(angle)*1.1,Math.sin(angle)*1.1,.13]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.065,.065,.14,6]} />{material(0,'#c6d0db')}</mesh>
        })}
        {labels && <Html position={[1.1,1.5,.2]} center distanceFactor={9}><button className={'cp-3d-label '+(layer===0?'active':'')} onClick={()=>onLayer(0)}>01 · FRONT COVER</button></Html>}
      </group>
    </group>
  )
}

export default function Motor3D(props: Motor3DProps) {
  return (
    <SceneBoundary key={props.resetKey} fallback={props.fallback}>
      <Canvas className="cp-three-canvas" shadows dpr={[1,1.5]} camera={{position:[6,4.2,7],fov:40,near:.1,far:80}}
        fallback={props.fallback} aria-label="โมเดล 3D มอเตอร์ไฟฟ้าสาธิต หมุนและซูมได้">
        <color attach="background" args={['#0b111b']} />
        <ambientLight intensity={.7} />
        <hemisphereLight args={['#c4e3ff','#283040',1.6]} />
        <directionalLight position={[5,8,4]} intensity={3} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.001} />
        <directionalLight position={[-4,2,-3]} intensity={2.5} color="#6caeff" />
        <pointLight position={[3,1,6]} intensity={25} color="#ffc494" />
        <MotorAssembly exploded={props.exploded} labels={props.labels} layer={props.layer} spinning={props.spinning} onLayer={props.onLayer} />
        <mesh position={[0,-1.47,.8]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[40,40]} /><meshStandardMaterial color="#0d1724" roughness={.85} metalness={.12} /></mesh>
        <gridHelper args={[20,40,'#20364b','#162637']} position={[0,-1.46,.8]} />
        <PerspectiveCamera makeDefault position={[6,4.2,7]} fov={40} near={.1} far={80} zoom={props.zoom} />
        <OrbitControls makeDefault target={[0,0,1]} minDistance={4} maxDistance={16} maxPolarAngle={Math.PI*.84} enableDamping />
      </Canvas>
    </SceneBoundary>
  )
}
