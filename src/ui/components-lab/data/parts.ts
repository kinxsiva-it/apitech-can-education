export type ComponentId = 'battery' | 'bms' | 'vcu' | 'inverter' | 'motor' | 'can'

export interface LabPart {
  id: ComponentId
  label: string
  thai: string
  category: string
  color: string
  summary: string
  layers: readonly { name: string; note: string }[]
  connections: readonly string[]
  signals: readonly string[]
  question: string
  answer: string
}

export const labParts: readonly LabPart[] = [
  {
    id: 'battery', label: 'BATTERY PACK', thai: 'ชุดแบตเตอรี่', category: 'ENERGY STORAGE', color: '#7bc9a6',
    summary: 'แหล่งพลังงานของชุดขับเคลื่อน ภาพแยกส่วนช่วยอธิบายความสัมพันธ์ของเซลล์ โมดูล และชุดแบตเตอรี่',
    layers: [{name:'ฝาครอบ',note:'แสดงขอบเขตของชุดแบตเตอรี่'}, {name:'โมดูลและเซลล์',note:'หน่วยกักเก็บพลังงานภายใน pack'}, {name:'ฐานและตัวเรือน',note:'โครงสร้างรองรับชิ้นส่วนภายใน'}],
    connections:['เส้นทางพลังงานไปยัง Inverter','จุดวัดและการตรวจสอบโดย BMS'],
    signals:['สถานะแบตเตอรี่สื่อสารผ่าน BMS','PackVoltage และ SOC ในเครือข่ายฝึก'],
    question:'Battery pack กับ BMS ทำหน้าที่เหมือนกันหรือไม่?',
    answer:'ต่างกัน: Battery pack กักเก็บพลังงาน ส่วน BMS ตรวจสอบและจัดการสถานะแบตเตอรี่ ในเครือข่ายฝึก BMS เป็นผู้ส่งข้อความสถานะแบตเตอรี่',
  },
  {
    id:'bms',label:'BATTERY MANAGEMENT',thai:'ระบบจัดการแบตเตอรี่ · BMS',category:'BATTERY CONTROL',color:'#70c9c6',
    summary:'จุดศึกษาการตรวจสอบสถานะแบตเตอรี่และการส่งข้อมูลไปยัง ECU อื่น แยกหน้าที่ของการวัด การประมวลผล และการสื่อสาร',
    layers:[{name:'ชุดเชื่อมต่อการวัด',note:'แสดงตำแหน่งรับข้อมูลจากแบตเตอรี่แบบแนวคิด'}, {name:'วงจรประมวลผล',note:'แทนส่วนประเมินสถานะแบตเตอรี่'}, {name:'ฐานวงจร',note:'แทนแผงวงจรและส่วนเชื่อมต่อ CAN'}],
    connections:['จุดตรวจสอบ Battery pack','เครือข่าย CAN ไปยัง VCU และ Dashboard'],
    signals:['0x280 · BMS · ทุก 500 ms','PackVoltage: byte 0–1, little-endian, factor 0.1 V','SOC: byte 2, factor 1%'],
    question:'ข้อมูล E0 01 50 ในเฟรม BMS แทนค่าอะไร?',
    answer:'ตาม mapping ฝึก: 0x01E0 = 480 แล้วคูณ 0.1 ได้ 48.0 V; 0x50 = 80 จึงได้ SOC 80% ข้อมูลนี้เป็นตัวอย่างสังเคราะห์ ไม่ใช่สเปกรถจริง',
  },
  {
    id:'vcu',label:'VEHICLE CONTROL UNIT',thai:'ชุดควบคุมรถ · VCU',category:'VEHICLE CONTROL',color:'#b79ae0',
    summary:'เชื่อมโยงคำสั่งผู้ขับกับการทำงานของระบบ EV ใช้สอนว่าข้อมูลจากปุ่มและคันเร่งกลายเป็นข้อความบน CAN ได้อย่างไร',
    layers:[{name:'ฝาครอบ ECU',note:'โครงสร้างภายนอกของชุดควบคุม'}, {name:'แผงควบคุม',note:'แทนส่วนรับ input และประมวลผล'}, {name:'ฐานและขั้วต่อ',note:'แทนจุดเชื่อม input และเครือข่าย'}],
    connections:['Ignition / Throttle / Brake','เครือข่าย CAN ร่วมกับ BMS และ Motor Controller'],
    signals:['0x380 · VCU · ทุก 100 ms','byte 0: Throttle 0–100%','byte 1: bit 0 Brake, bit 1 Drive enable'],
    question:'เมื่อปรับคันเร่ง ควรเริ่มตรวจดูข้อความจาก ECU ใด?',
    answer:'ในเครือข่ายฝึกนี้ เริ่มที่ข้อความ VCU ID 0x380 ซึ่งมีสัญญาณ Throttle แล้วจึงสังเกตสถานะ Motor ผ่าน ID 0x180',
  },
  {
    id:'inverter',label:'INVERTER / CONTROLLER',thai:'อินเวอร์เตอร์และชุดควบคุมมอเตอร์',category:'POWER CONVERSION',color:'#70b9e4',
    summary:'พื้นที่สอนความสัมพันธ์ระหว่างพลังงานจากแบตเตอรี่ คำสั่งควบคุม และมอเตอร์ ภาพนี้รวมส่วนควบคุมกับภาคกำลังในเชิงแนวคิด',
    layers:[{name:'ฝาครอบ',note:'ขอบเขตชุด Inverter / Controller'}, {name:'ภาคควบคุมและภาคกำลัง',note:'แสดงการแยกหน้าที่ของส่วนประมวลผลกับการจ่ายพลังงาน'}, {name:'ฐานระบายความร้อน',note:'แสดงโครงสร้างฐานประกอบของชุด'}],
    connections:['พลังงานจาก Battery pack','ทางออกกำลังไป Motor','CAN สำหรับคำสั่งและสถานะ'],
    signals:['เครือข่ายฝึกรวมสถานะไว้ที่ Motor Controller','ID 0x180: RPM และอุณหภูมิมอเตอร์','ยังไม่มี ID เฉพาะ Inverter เพิ่มเติมใน handoff'],
    question:'เส้นพลังงานกับสาย CAN มีหน้าที่เหมือนกันหรือไม่?',
    answer:'ต่างกัน: เส้นพลังงานเชื่อมชุดจ่ายพลังงานกับมอเตอร์ ส่วน CAN ใช้แลกเปลี่ยนข้อความควบคุมและสถานะ ภาพสอนควรแยกเส้นทั้งสองประเภทให้ชัด',
  },
  {
    id:'motor',label:'ELECTRIC MOTOR',thai:'มอเตอร์ไฟฟ้า',category:'ELECTRIC DRIVE',color:'#ff9b66',
    summary:'สำรวจชิ้นส่วนของมอเตอร์ผ่านภาพแยกส่วน และเชื่อมสิ่งที่สังเกตกับค่าความเร็วรอบและอุณหภูมิในเครือข่ายฝึก',
    layers:[{name:'ฝาครอบด้านหน้า',note:'โครงสร้างปิดด้านปลายของมอเตอร์'}, {name:'Rotor และเพลา',note:'ส่วนหมุนที่เชื่อมกับทางออกกำลัง'}, {name:'Stator และตัวเรือน',note:'ส่วนอยู่กับที่รอบ Rotor'}],
    connections:['พลังงานจาก Inverter','เพลาทางออกกำลัง','ข้อมูลสถานะผ่าน Motor Controller'],
    signals:['0x180 · Motor Controller · ทุก 100 ms','RPM: byte 0–1, little-endian, factor 1 rpm','Motor temperature: byte 2, offset −40 °C'],
    question:'ใครเป็นผู้ส่ง RPM ในเครือข่ายฝึก?',
    answer:'Motor Controller เป็น publisher ของเฟรม 0x180 ไม่ควรตีความว่าชิ้นส่วน Motor ทุกตัวเชื่อม CAN โดยตรง รูปแบบการเชื่อมต่อขึ้นกับระบบที่ออกแบบ',
  },
  {
    id:'can',label:'CAN WIRING',thai:'สายสื่อสารและจุดต่อ CAN',category:'COMMUNICATION',color:'#e2be77',
    summary:'แยกสายสื่อสารออกจากเส้นพลังงาน และแสดงการเชื่อม ECU หลายตัวกับบัสร่วม เพื่อเชื่อมบทเรียนโครงสร้างรถกับข้อความ CAN',
    layers:[{name:'ECU nodes',note:'VCU, BMS และ Motor Controller ในเครือข่ายฝึก'}, {name:'CAN-H / CAN-L',note:'คู่สายสื่อสารของบัส'}, {name:'Termination',note:'แสดงองค์ประกอบปลายบัสในภาพการสอน'}],
    connections:['VCU ↔ CAN bus','BMS ↔ CAN bus','Motor Controller ↔ CAN bus'],
    signals:['0x180 · Motor Controller','0x280 · BMS','0x380 · VCU'],
    question:'จาก CAN ID อย่างเดียว เรารู้ความหมาย payload ทันทีหรือไม่?',
    answer:'ยังไม่ได้ ต้องใช้ signal mapping หรือ DBC ของเครือข่ายนั้นด้วย ในโปรเจกต์นี้ใช้ mapping สังเคราะห์ตาม handoff เพื่อสอนการถอดรหัส',
  },
]
