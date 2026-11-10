import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { Material, Object3D } from 'three'
import {
  MOTOR_COMPONENT_COUNT, MOTOR_COORDINATE_MAPPING, MOTOR_EXPLODED_OFFSETS,
  MOTOR_PARENT_GROUPS, isMotorPartVisible, originalPartName,
} from './motor-view-config.ts'
import type { MotorGroupId, MotorSelection, MotorViewMode } from './motor-view-config.ts'
import { describeMotorPart } from './motor-component-info.ts'
import type { MotorPartInfo } from './motor-component-info.ts'

export function createMotorInstance(source: Object3D) {
  const scene = source.clone(true)
  scene.updateMatrixWorld(true)
  const nodes: Object3D[] = []
  const meshes: Mesh[] = []
  scene.traverse((node) => {
    nodes.push(node)
    if (node instanceof Mesh) meshes.push(node)
  })
  const metadata = scene.getObjectByName('EV_IPMSM')?.userData
  if (metadata?.units !== 'm' || metadata.upAxis !== 'Y' || metadata.motorAxis !== 'X'
    || metadata.coordinateMapping !== MOTOR_COORDINATE_MAPPING || metadata.noBakedExplodedTransforms !== true) {
    throw new Error('พิกัด GLB ไม่ตรงกับ config ที่ตรวจสอบไว้ จึงยังไม่ใช้ offsets กับไฟล์นี้')
  }
  if (meshes.length !== MOTOR_COMPONENT_COUNT) throw new Error('จำนวน mesh ไม่ตรงกับ baseline 63 ชิ้น')
  const shaft = meshes.find((mesh) => mesh.name === 'DriveShaft')
  if (!shaft || Math.abs(new Box3().setFromObject(shaft).getSize(new Vector3()).x - .19) > .00001) {
    throw new Error('ขนาดเพลาไม่ตรงกับ baseline 190 มม. กรุณาตรวจ GLB')
  }

  const baseline = nodes.map((node) => ({
    node, position: node.position.clone(), quaternion: node.quaternion.clone(),
    scale: node.scale.clone(), visible: node.visible, matrix: node.matrix.clone(),
    matrixAutoUpdate: node.matrixAutoUpdate,
  }))
  const entries = meshes.map((mesh) => {
    const name = originalPartName(mesh.name)
    let parent = mesh.parent
    let group: MotorGroupId = 'other'
    let initiallyVisible = mesh.visible
    while (parent) {
      if (group === 'other' && MOTOR_PARENT_GROUPS[parent.name]) group = MOTOR_PARENT_GROUPS[parent.name]!
      initiallyVisible = initiallyVisible && parent.visible
      parent = parent.parent
    }
    const delta = MOTOR_EXPLODED_OFFSETS.get(name) ?? ([0, 0, 0] as const)
    const worldOffset = new Vector3(...delta)
    const origin = mesh.getWorldPosition(new Vector3())
    const target = origin.clone().add(worldOffset)
    if (mesh.parent) {
      mesh.parent.worldToLocal(origin)
      mesh.parent.worldToLocal(target)
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const info: MotorPartInfo = {
      id: mesh.name, name, group, initiallyVisible, ...describeMotorPart(name),
      appearance: [...new Set(materials.map((material) => material.name || 'Unnamed material'))].join(', '),
    }
    return {
      mesh, info, localOffset: target.sub(origin), worldOffset,
      originalMaterial: mesh.material,
      box: new Box3().setFromObject(mesh),
    }
  })
  const parts = entries.map((entry) => entry.info)
  const allBounds = new Box3()
  entries.forEach((entry) => allBounds.union(entry.box))
  const entriesByName = new Map(entries.map((entry) => [entry.info.id, entry]))
  const highlightMaterials = new Map<Mesh, Material[]>()
  const highlighted = new Set<Mesh>()

  function apply(mode: MotorViewMode, extra = false, hidden: readonly MotorGroupId[] = []) {
    for (const snapshot of baseline) {
      snapshot.node.position.copy(snapshot.position)
      snapshot.node.quaternion.copy(snapshot.quaternion)
      snapshot.node.scale.copy(snapshot.scale)
      snapshot.node.visible = snapshot.visible
      snapshot.node.matrixAutoUpdate = snapshot.matrixAutoUpdate
      snapshot.node.matrix.copy(snapshot.matrix)
    }
    for (const entry of entries) {
      if (!isMotorPartVisible(entry.info.name, entry.info.group, mode, extra, hidden)) entry.mesh.visible = false
      if (mode === 'exploded') {
        entry.mesh.position.add(entry.localOffset)
        entry.mesh.updateMatrix()
      }
    }
    scene.updateMatrixWorld(true)
  }

  function highlight(selection: MotorSelection) {
    // Restore original references first. Shared source materials are never edited.
    for (const mesh of highlighted) {
      const entry = entriesByName.get(mesh.name)
      if (entry) mesh.material = entry.originalMaterial
    }
    highlighted.clear()
    if (!selection) return
    const targets = selection.kind === 'part'
      ? [entriesByName.get(selection.name)].filter((entry) => entry !== undefined)
      : entries.filter((entry) => entry.info.group === selection.id)
    for (const entry of targets) {
      if (!entry.mesh.visible || !entry.info.initiallyVisible) continue
      let materials = highlightMaterials.get(entry.mesh)
      if (!materials) {
        const originals = Array.isArray(entry.originalMaterial) ? entry.originalMaterial : [entry.originalMaterial]
        materials = originals.map((original) => {
          const material = original.clone()
          if (material instanceof MeshStandardMaterial) {
            material.emissive.set('#ffb05d')
            material.emissiveIntensity = .32
          }
          return material
        })
        highlightMaterials.set(entry.mesh, materials)
      }
      entry.mesh.material = Array.isArray(entry.originalMaterial) ? materials : materials[0]!
      highlighted.add(entry.mesh)
    }
  }

  function getBounds(mode: MotorViewMode, extra = false, hidden: readonly MotorGroupId[] = []) {
    const box = new Box3()
    for (const entry of entries) {
      if (!entry.info.initiallyVisible || !isMotorPartVisible(entry.info.name, entry.info.group, mode, extra, hidden)) continue
      const partBox = entry.box.clone()
      if (mode === 'exploded') partBox.translate(entry.worldOffset)
      box.union(partBox)
    }
    return box.isEmpty() ? allBounds.clone() : box
  }

  function disposeHighlights() {
    highlight(null)
    for (const materials of highlightMaterials.values()) materials.forEach((material) => material.dispose())
    highlightMaterials.clear()
  }

  return { scene, meshes, parts, apply, highlight, getBounds, disposeHighlights }
}
