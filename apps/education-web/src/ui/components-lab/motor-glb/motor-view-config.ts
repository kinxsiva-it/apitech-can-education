/** Viewer-only configurations; original GLB geometry/transforms are untouched.
 * Verified GLB mapping: [x,y,z] source mm -> [x,z,-y] / 1000 m.
 */
export type MotorViewMode = 'assembled' | 'cutaway' | 'exploded'
export type Offset = readonly [number, number, number]
export type MotorGroupId = 'housing' | 'stator' | 'rotor' | 'shaft' | 'covers' | 'other'
export type MotorSelection = { kind: 'part'; name: string } | { kind: 'group'; id: MotorGroupId } | null

export const MOTOR_MODEL_PATH = 'assets/models/motorglb/ev-ipmsm-motor.glb'
export const MOTOR_COORDINATE_MAPPING = '[x,y,z] mm -> [x,z,-y] / 1000 m'
export const MOTOR_COMPONENT_COUNT = 63

export function sourceMmToGlb([x, y, z]: Offset): Offset {
  return [x / 1000, z / 1000, -y / 1000]
}
const numberedNames = (base: string, count: number) =>
  Array.from({ length: count }, (_, index) => index === 0 ? base : base + ' (' + (index + 1) + ')')
export const originalPartName = (loadedName: string) => loadedName.replace(/_\(/g, ' (')

export const MOTOR_CUTAWAY_HIDDEN = new Set([
  'MotorHousing', 'HousingAccessQuarter',
  ...numberedNames('CoolingRib', 8), ...numberedNames('CoolingRibAccess', 8),
  'RearEndCover', 'FrontEndCover', 'FrontCoverAccessQuarter',
])
// Extra cutaway opens the two existing stator quarter bodies. Keep RotorCore:
// embedded magnets should not appear unsupported. This is visibility, not clipping.
export const MOTOR_ISOLATION_HIDDEN = new Set(['StatorAccessQuarter', 'StatorLowerQuarter'])

// Compact teaching layout, intentionally distinct from the source document's
// earlier "latest tested" offsets. All deltas still reference the assembled GLB.
// The shaft naturally extends through other axial stations; this is not a
// collision-free disassembly simulation. Rotor/magnets keep their relative fit.
const rules: readonly { names: readonly string[]; deltaMm: Offset }[] = [
  { names: ['MotorHousing', 'HousingAccessQuarter', ...numberedNames('CoolingRib', 8), ...numberedNames('CoolingRibAccess', 8)], deltaMm: [0, 0, 0] },
  { names: ['RearEndCover'], deltaMm: [-45, 0, 0] },
  { names: ['RearBearing'], deltaMm: [-22, 0, 0] },
  { names: ['StatorCore', 'StatorAccessQuarter', 'StatorLowerQuarter'], deltaMm: [100, 0, 0] },
  { names: [...numberedNames('CopperWinding', 12), ...numberedNames('EndWindingRear', 6), ...numberedNames('EndWindingFront', 6)], deltaMm: [195, 0, 0] },
  { names: ['RotorCore', 'DriveShaft', 'RotorShoulder', 'ShaftKey', ...numberedNames('PermanentMagnet', 8)], deltaMm: [310, 0, 0] },
  { names: ['FrontBearing'], deltaMm: [400, 0, 0] },
  { names: ['FrontEndCover', 'FrontCoverAccessQuarter'], deltaMm: [430, 0, 0] },
  { names: ['MountingFoot'], deltaMm: [0, 0, -45] },
]
export const MOTOR_EXPLODED_OFFSETS = new Map(
  rules.flatMap((rule) => rule.names.map((name) => [name, sourceMmToGlb(rule.deltaMm)] as const)),
)

export const MOTOR_GROUPS: readonly { id: MotorGroupId; label: string; thai: string; color: string; description: string }[] = [
  { id: 'housing', label: 'Housing & Cooling', thai: 'ตัวเรือนและครีบ', color: '#86b1d0', description: 'โครงสร้างภายนอกและครีบที่อยู่กับตัวเรือนในโมเดลนี้' },
  { id: 'stator', label: 'Stator & Windings', thai: 'สเตเตอร์และขดลวด', color: '#e9aa73', description: 'กลุ่มส่วนอยู่กับที่และขดลวด เลือกชิ้นส่วนย่อยเพื่อดูหน้าที่' },
  { id: 'rotor', label: 'Rotor & Magnets', thai: 'โรเตอร์และแม่เหล็ก', color: '#ba9fdd', description: 'แกนโรเตอร์และแม่เหล็กฝังอยู่ภายใน คงตำแหน่งสัมพันธ์กันใน Exploded' },
  { id: 'shaft', label: 'Shaft & Bearings', thai: 'เพลาและแบริ่ง', color: '#8acbb8', description: 'ชิ้นส่วนทางออกกำลังและส่วนรองรับการหมุน' },
  { id: 'covers', label: 'Covers & Mounting', thai: 'ฝาครอบและฐาน', color: '#9faed5', description: 'ฝาด้านหน้า/หลังและฐานรองรับในแบบจำลอง' },
  { id: 'other', label: 'Other components', thai: 'ชิ้นส่วนอื่น', color: '#93a0b2', description: 'ยังไม่มีข้อมูลกลุ่มเพิ่มเติมสำหรับชิ้นส่วนนี้' },
]
export const MOTOR_PARENT_GROUPS: Readonly<Record<string, MotorGroupId>> = {
  Group_housing: 'housing', Group_ribs: 'housing',
  Group_stator: 'stator', Group_windings: 'stator',
  Group_rotor: 'rotor', Group_magnets: 'rotor',
  Group_shaft: 'shaft', Group_bearings: 'shaft',
  Group_covers: 'covers', Group_support: 'covers',
}
export function isMotorPartVisible(name: string, group: MotorGroupId, mode: MotorViewMode, extra: boolean, hidden: readonly MotorGroupId[]) {
  return !hidden.includes(group) && !(mode === 'cutaway' && (
    MOTOR_CUTAWAY_HIDDEN.has(name) || (extra && MOTOR_ISOLATION_HIDDEN.has(name))
  ))
}
