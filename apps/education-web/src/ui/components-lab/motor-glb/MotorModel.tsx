import { useLayoutEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { createMotorInstance } from './motor-model-state'
import { MOTOR_MODEL_PATH } from './motor-view-config'
import type { MotorGroupId, MotorSelection, MotorViewMode } from './motor-view-config'
import type { MotorPartInfo } from './motor-component-info'
import { MotorCameraRig } from './MotorCameraRig'

export function MotorModel({ mode, extraDetail, hiddenGroups, selection, resetKey, onReady, onSelect }: {
  mode: MotorViewMode
  extraDetail: boolean
  hiddenGroups: readonly MotorGroupId[]
  selection: MotorSelection
  resetKey: number
  onReady: (parts: readonly MotorPartInfo[]) => void
  onSelect: (selection: MotorSelection) => void
}) {
  const gltf = useGLTF(import.meta.env.BASE_URL + MOTOR_MODEL_PATH, false, false)
  const [instance] = useState(() => createMotorInstance(gltf.scene))
  const invalidate = useThree((state) => state.invalidate)
  const bounds = useMemo(() => instance.getBounds(mode, extraDetail, hiddenGroups), [instance, mode, extraDetail, hiddenGroups])

  useLayoutEffect(() => {
    onReady(instance.parts)
    return () => instance.disposeHighlights()
  }, [instance, onReady])

  useLayoutEffect(() => {
    instance.apply(mode, extraDetail, hiddenGroups)
    invalidate()
  }, [instance, mode, extraDetail, hiddenGroups, invalidate])

  useLayoutEffect(() => {
    instance.highlight(selection)
    invalidate()
  }, [instance, selection, mode, extraDetail, hiddenGroups, invalidate])

  const pick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    // A drag/orbit gesture must not select a mesh.
    if (event.button === 0 && event.delta <= 3) onSelect({ kind: 'part', name: event.object.name })
  }

  return <>
    <primitive object={instance.scene} dispose={null} onClick={pick} />
    <MotorCameraRig bounds={bounds} resetKey={resetKey} />
  </>
}
