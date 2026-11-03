import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera, Vector3 } from 'three'
import type { Box3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function MotorCameraRig({ bounds, resetKey }: { bounds: Box3; resetKey: number }) {
  const ref = useRef<OrbitControlsImpl>(null)
  const { camera, size, invalidate } = useThree()
  const frame = useMemo(() => {
    const center = bounds.getCenter(new Vector3())
    const dimensions = bounds.getSize(new Vector3())
    const radius = Math.max(dimensions.length() / 2, .01)
    return { center, radius, minTarget: center.clone().addScalar(-radius), maxTarget: center.clone().addScalar(radius) }
  }, [bounds])

  useLayoutEffect(() => {
    const controls = ref.current
    if (!controls || !(camera instanceof PerspectiveCamera)) return
    const verticalHalf = camera.fov * Math.PI / 360
    const horizontalHalf = Math.atan(Math.tan(verticalHalf) * size.width / Math.max(size.height, 1))
    const distance = frame.radius / Math.sin(Math.min(verticalHalf, horizontalHalf)) * 1.16
    // Camera only: never rotate/recenter the model or its individual meshes.
    // Favor the open +Z stator face and still show X-axis shaft and mounting foot.
    camera.position.copy(frame.center).add(new Vector3(.95, .65, 1.65).normalize().multiplyScalar(distance))
    camera.near = Math.max(.0001, frame.radius / 200)
    camera.far = Math.max(5, distance * 15)
    camera.updateProjectionMatrix()
    controls.target.copy(frame.center)
    controls.minDistance = frame.radius * 1.3
    controls.maxDistance = distance * 3
    controls.minPolarAngle = .12
    controls.maxPolarAngle = Math.PI - .12
    controls.update()
    controls.saveState()
    invalidate()
  }, [camera, frame, resetKey, size.width, size.height, invalidate])

  const constrainPan = () => {
    const controls = ref.current
    if (!controls) return
    const previous = controls.target.clone()
    controls.target.clamp(frame.minTarget, frame.maxTarget)
    // Keep the same camera-to-target vector when clamping excessive panning.
    camera.position.add(controls.target.clone().sub(previous))
    controls.minDistance = frame.radius * 1.3 + controls.target.distanceTo(frame.center)
    if (controls.getDistance() < controls.minDistance) {
      const direction = camera.position.clone().sub(controls.target).normalize()
      camera.position.copy(controls.target).addScaledVector(direction, controls.minDistance)
    }
  }

  return <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={.12}
    rotateSpeed={.75} zoomSpeed={.75} panSpeed={.6} onChange={constrainPan} />
}
