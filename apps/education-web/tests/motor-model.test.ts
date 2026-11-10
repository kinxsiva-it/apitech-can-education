import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { Box3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createMotorInstance } from '../src/ui/components-lab/motor-glb/motor-model-state.ts'
import { sourceMmToGlb } from '../src/ui/components-lab/motor-glb/motor-view-config.ts'

const file = await readFile(new URL('../public/assets/models/motorglb/ev-ipmsm-motor.glb', import.meta.url))
const source = (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene

const approx = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, actual + ' ≠ ' + expected)
const snapshot = (scene: typeof source) => {
  const rows: unknown[] = []
  scene.traverse((node) => rows.push([node.name, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray(), node.visible, node.matrix.toArray()]))
  return rows
}

test('source coordinates convert millimetres and Z-up to GLB metres/Y-up', () => {
  assert.deepEqual(sourceMmToGlb([-90, 0, 0]), [-.09, 0, -0])
  assert.deepEqual(sourceMmToGlb([0, 0, -45]), [0, -.045, -0])
})

test('real GLB has all 63 mapped meshes; cached source stays unchanged', () => {
  const before = snapshot(source)
  const instance = createMotorInstance(source)
  assert.equal(instance.meshes.length, 63)
  instance.apply('exploded')
  assert.deepEqual(snapshot(source), before)
})

test('cutaway hides the outer shell; extra detail keeps rotor iron in place', () => {
  const instance = createMotorInstance(source)
  instance.apply('cutaway')
  assert.equal(instance.meshes.filter((mesh) => mesh.visible).length, 42)
  assert.equal(instance.scene.getObjectByName('RotorCore')!.visible, true)
  assert.equal(instance.scene.getObjectByName('PermanentMagnet')!.visible, true)
  assert.equal(instance.scene.getObjectByName('CoolingRibAccess_(8)')!.visible, false)
  instance.apply('cutaway', true)
  assert.equal(instance.meshes.filter((mesh) => mesh.visible).length, 40)
  assert.equal(instance.scene.getObjectByName('RotorCore')!.visible, true)
  assert.equal(instance.scene.getObjectByName('StatorAccessQuarter')!.visible, false)
  assert.equal(instance.scene.getObjectByName('StatorLowerQuarter')!.visible, false)
  instance.apply('cutaway', false)
  assert.equal(instance.scene.getObjectByName('RotorCore')!.visible, true)
})

test('compact exploded layout moves 45 meshes and leaves parents fixed', () => {
  const instance = createMotorInstance(source)
  instance.apply('exploded')
  assert.equal(instance.meshes.filter((mesh) => mesh.position.length() > 1e-9).length, 45)
  assert.equal(instance.meshes.filter((mesh) => mesh.visible).length, 63)
  const box = new Box3().setFromObject(instance.scene)
  approx(box.min.x, -.105)
  approx(box.max.x, .49)
  approx(box.min.y, -.102)
  approx(box.max.y, .052)
  approx(instance.scene.getObjectByName('MountingFoot')!.position.y, -.045)
  approx(instance.scene.getObjectByName('DriveShaft')!.position.x, .31)
  approx(instance.scene.getObjectByName('PermanentMagnet')!.position.x, .31)
  approx(instance.scene.getObjectByName('Group_shaft')!.position.length(), 0)
})

test('repeated modes never accumulate offsets; assembled restores every transform exactly', () => {
  const instance = createMotorInstance(source)
  instance.scene.updateMatrixWorld(true)
  const before = snapshot(instance.scene as typeof source)
  instance.apply('exploded')
  const exploded = snapshot(instance.scene as typeof source)
  instance.apply('exploded')
  assert.deepEqual(snapshot(instance.scene as typeof source), exploded)
  for (let index = 0; index < 12; index++) {
    instance.apply('cutaway', true)
    instance.apply('exploded')
    instance.apply('assembled')
    assert.deepEqual(snapshot(instance.scene as typeof source), before)
  }
})

test('unexpected coordinates or a missing reference shaft are rejected', () => {
  const wrongUnits = source.clone(true)
  wrongUnits.getObjectByName('EV_IPMSM')!.userData.units = 'mm'
  assert.throws(() => createMotorInstance(wrongUnits), /พิกัด/)
  const wrongNames = source.clone(true)
  wrongNames.getObjectByName('DriveShaft')!.name = 'UnknownShaft'
  assert.throws(() => createMotorInstance(wrongNames), /เพลา/)
})
