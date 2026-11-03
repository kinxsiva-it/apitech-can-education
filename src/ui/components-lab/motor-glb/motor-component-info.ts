import type { MotorGroupId } from './motor-view-config'

export interface MotorPartInfo {
  id: string
  name: string
  thai: string | null
  group: MotorGroupId
  purpose: string
  material: string | null
  appearance: string
  initiallyVisible: boolean
}

const info: Readonly<Record<string, { thai: string; purpose: string }>> = {
  MotorHousing: { thai: 'ตัวเรือนมอเตอร์', purpose: 'โครงสร้างภายนอกที่รองรับและปกป้องชิ้นส่วนภายในมอเตอร์' },
  HousingAccessQuarter: { thai: 'ส่วนเปิดของตัวเรือน', purpose: 'ส่วนตัวเรือนที่แยกไว้ในไฟล์ เพื่อเปิดดูภายในด้วยการซ่อนชิ้นส่วน' },
  CoolingRib: { thai: 'ครีบระบายความร้อน', purpose: 'แสดงครีบบนตัวเรือนสำหรับอธิบายพื้นที่ผิวภายนอกของชุดมอเตอร์' },
  CoolingRibAccess: { thai: 'ครีบบนส่วนเปิดตัวเรือน', purpose: 'ส่วนครีบที่สัมพันธ์กับช่องเปิดตัวเรือนในแบบจำลองนี้' },
  StatorCore: { thai: 'แกนสเตเตอร์', purpose: 'แกนส่วนอยู่กับที่ของมอเตอร์ ทำงานร่วมกับขดลวดและช่องว่างรอบโรเตอร์' },
  StatorAccessQuarter: { thai: 'ส่วนเปิดสเตเตอร์ด้านบน', purpose: 'ชิ้นสเตเตอร์ที่แยกไว้เพื่อใช้เปิดดูโครงสร้างภายใน' },
  StatorLowerQuarter: { thai: 'ส่วนเปิดสเตเตอร์ด้านล่าง', purpose: 'อีกส่วนของสเตเตอร์ที่แยกไว้ให้ใช้ซ่อนแสดงในการสอน' },
  CopperWinding: { thai: 'ขดลวดสเตเตอร์', purpose: 'ส่วนขดลวดสำหรับอธิบายการสร้างสนามแม่เหล็กของสเตเตอร์' },
  EndWindingRear: { thai: 'ปลายขดลวดด้านหลัง', purpose: 'แสดงการเชื่อมโยงปลายขดลวดด้านหลังของโมเดล' },
  EndWindingFront: { thai: 'ปลายขดลวดด้านหน้า', purpose: 'แสดงการเชื่อมโยงปลายขดลวดด้านหน้าของโมเดล' },
  RotorCore: { thai: 'แกนโรเตอร์', purpose: 'แกนส่วนหมุนที่มีแม่เหล็กฝังอยู่ในโมเดล IPMSM นี้' },
  PermanentMagnet: { thai: 'แม่เหล็กถาวร', purpose: 'แม่เหล็กที่อยู่ภายในแกนโรเตอร์ สีในไฟล์ใช้แยกกลุ่มภาพ ไม่ใช่ข้อมูลเกรดหรือค่าความแรงแม่เหล็ก' },
  DriveShaft: { thai: 'เพลาขับ', purpose: 'ส่วนทางออกกำลังที่เชื่อมกับชุดหมุนของมอเตอร์' },
  RotorShoulder: { thai: 'บ่าเพลาโรเตอร์', purpose: 'แสดงบ่าหรือบริเวณเปลี่ยนหน้าตัดของชุดเพลาในโมเดล' },
  ShaftKey: { thai: 'ลิ่มเพลา', purpose: 'ชิ้นส่วนประกอบบนเพลาที่แสดงตำแหน่งการเชื่อมต่อทางกล' },
  RearBearing: { thai: 'แบริ่งด้านหลัง', purpose: 'ส่วนรองรับเพลาด้านหลัง ช่วยอธิบายตำแหน่งรองรับการหมุน' },
  FrontBearing: { thai: 'แบริ่งด้านหน้า', purpose: 'ส่วนรองรับเพลาด้านหน้า ช่วยอธิบายความสัมพันธ์กับฝาครอบและเพลา' },
  RearEndCover: { thai: 'ฝาครอบด้านหลัง', purpose: 'ปิดปลายตัวเรือนด้านหลังของมอเตอร์' },
  FrontEndCover: { thai: 'ฝาครอบด้านหน้า', purpose: 'ปิดปลายตัวเรือนด้านเพลาขับของมอเตอร์' },
  FrontCoverAccessQuarter: { thai: 'ส่วนเปิดฝาครอบด้านหน้า', purpose: 'ส่วนฝาครอบที่แยกไว้เพื่อเปิดดูโครงสร้างภายใน' },
  MountingFoot: { thai: 'ฐานยึดมอเตอร์', purpose: 'ฐานสำหรับแสดงความสัมพันธ์ของมอเตอร์กับจุดรองรับ' },
}

export function describeMotorPart(name: string) {
  const base = name.replace(/ \(\d+\)$/, '')
  const known = info[base]
  return {
    thai: known?.thai ?? null,
    purpose: known?.purpose ?? 'ยังไม่มีข้อมูลหน้าที่เพิ่มเติมสำหรับชิ้นส่วนนี้',
    // GLB only contains scalar appearance / approximated PBR, not verified alloys.
    material: base === 'CopperWinding' ? 'ชื่อ Node ระบุ CopperWinding; ไม่ระบุเกรดหรือคุณสมบัติวัสดุ' : null,
  }
}
