# แผนพัฒนาร่วมกัน — APITech CAN Education

วันที่วิเคราะห์: 31 ตุลาคม 2026

แหล่งข้อกำหนด: [Customer handoff v1.0](./APITech_CAN_Bus_Education_Simulation_Handoff.md)
เอกสารนี้เป็นการวิเคราะห์และข้อเสนอแผนงาน ยังไม่ใช่การรับรองขอบเขตหรือกำหนดส่งจากลูกค้า

## การแบ่งหน้า EV ที่ตกลงและเริ่มพัฒนาแล้ว

การเลือก branch ของแต่ละหมวดดูที่ [คู่มือ branch](./BRANCH_GUIDE.md)
EV COMPONENT LAB แยกจาก Explorer เพื่อสอนโครงสร้างและหน้าที่ของชิ้นส่วน EV รายชิ้น
ปัจจุบันยังเป็น placeholder รอออกแบบ UI และเนื้อหา

- EV SYSTEM EXPLORER: อิง MOTION OF MECHANIC เพื่อสำรวจองค์ประกอบและเส้นทางพลังงาน/CAN
  ใช้ component EvSystemExplorer.tsx ซึ่งย้ายมาจากหน้า EV เดิม
- EV SIMULATION: อิง SIMULATDATA เพื่อควบคุม input, เลือก scenario, ดู dashboard และสถานะ CAN
  ใช้ component EvSimulation.tsx ใหม่ แยกจากหน้าสำรวจโครงสร้าง
- ทั้งสองหน้ายังเป็น UI preview; input หน้าจำลองเก็บใน local React state
  ยังไม่คำนวณ telemetry ไม่สร้างเฟรม และยังไม่เชื่อม Zustand/engine
- input เริ่มต้นที่แสดงเป็นค่า UI สำหรับทดลองหน้าจอ ไม่ใช่ผลการจำลอง
- ขั้นต่อไปเชื่อมทั้งสองหน้ากับ engine เดียวกันตามแผน เพื่อให้ telemetry และ CAN สอดคล้องกัน

## 1. เป้าหมายและขอบเขตที่ทราบแล้ว

ผู้เรียนควรทดลองควบคุม EV จำลอง เห็น ECU แลกเปลี่ยน CAN frames และอธิบาย
การแปลง raw bytes เป็น RPM, SOC และแรงดันได้ ผู้สอนหยุด รีเซ็ต และเล่นสถานการณ์เดิมซ้ำได้
เพิ่มเนื้อหาและสถานการณ์ผ่าน configuration โดยไม่ต้องแก้ UI

ข้อกำหนดจากการสนทนาที่ตัดสินแล้ว:

- Browser-first และรองรับ offline; React/Vite, strict TypeScript, Tailwind, Zustand
- Simulation core เป็น pure TypeScript แยกจาก React
- Supabase เป็นงานระยะถัดไป ไม่ควรเป็น dependency ที่จำเป็นต่อการเรียนใน MVP
- ผู้ใช้ยืนยันว่า HTML เดิมเป็นเพียงตัวอย่าง UI สำหรับอ้างอิงการพัฒนา CAN Bus
  เราจะพัฒนา UI ใน React; ไม่กำหนดให้ฝัง HTML เดิมหรือเชื่อม postMessage เป็นงาน MVP

ข้อกำหนดจาก handoff:

- MVP เป็น virtual simulation; training IDs เป็นข้อมูลสังเคราะห์
- เริ่มจาก Classical CAN, standard 11-bit ID, 500 kbit/s และ payload ไม่เกิน 8 bytes
- Motor 0x180 ทุก 100 ms, BMS 0x280 ทุก 500 ms, VCU 0x380 ทุก 100 ms
- จำลองระดับข้อความ แยกภาพประกอบ electrical waveform ออกจากแบบจำลองที่ผ่านการตรวจสอบ
- ระยะถัดไปมี lessons, faults, record/replay, instructor tools และ DBC Lab
- การเชื่อม hardware, CAN FD, UDS และ AI explanation อยู่ในระยะหลัง

## 2. สถานะโค้ดที่ตรวจพบ

| ส่วน | มีแล้ว | ยังขาด |
|---|---|---|
| Frontend | Router, dashboard เริ่มต้น, Tailwind | Home/Learn/Monitor/Inspector และหน้าจอใช้งานจริง |
| Store | inputs, telemetry, typed actions, reset | adapter เชื่อม engine และ semantics ของ reset/pause ทั้งระบบ |
| Core | fixed-step clock และ types | ECU, scheduler, scenario engine, engine lifecycle |
| Decoder | SignalConfig และ message types | encode/decode, validation, fixtures, DBC parser |
| Content | JSON mapping ของ BMS | Motor/VCU mappings, schema, lessons, scenarios, quizzes |
| UI reference | HTML ตัวอย่าง และ iframe viewer ใน scaffold | ศึกษาหน้าตา/interaction เพื่อออกแบบ React UI; viewer ไม่ใช่ข้อกำหนดผลิตภัณฑ์ |
| Offline | แอปไม่บังคับใช้ backend | service worker/cache, offline verification |
| QA | build/lint scripts | automated acceptance tests ของ simulator/decoder และ browser checks |

ยังไม่ถือว่า P0 เสร็จ เพราะยังไม่มี topology demo และ deterministic scenario ตามเกณฑ์ลูกค้า

## 3. หลักการออกแบบที่เสนอ

เส้นทางข้อมูล:

`UI inputs → engine adapter → Scenario/ECU → scheduler → CAN frames → decoder → store → UI`

- Engine เป็นเจ้าของเวลาจำลองและสถานะทางฟิสิกส์; Zustand ใช้ส่ง input และเผยแพร่ snapshot ให้ UI
- ใช้ simulation time ในการส่งเฟรมและคำนวณ timeout; ห้ามให้ React render เป็นตัวกำหนดเวลา
- Dashboard รับค่าที่ decode จากเฟรม เพื่อให้ค่าหน้าปัดสอดคล้องกับสิ่งที่ผู้เรียนเห็นใน Monitor
- กำหนดลำดับเหตุการณ์เมื่อเวลาเท่ากันอย่างชัดเจน; แยก scheduler ระดับข้อความออกจากบทเรียน arbitration
- Pause ต้องหยุดเวลา/สถานะ/การสร้างเฟรม; reset ต้องคืน clock, ECU, queue, decoder state และ log
- บันทึก input events พร้อมเวลา ถ้าต้องการ replay drive scenario แบบได้ผลเดิม
- แยก CSV frame replay ออกจาก scenario replay เพราะ CSV อย่างเดียวไม่จำเป็นต้องมี input/engine state ครบ
- จำกัดจำนวนเฟรมที่แสดงและเก็บในหน่วยความจำ ป้องกันการสอนนานแล้ว UI ช้าลง
- Config ต้องผ่าน runtime validation ก่อนใช้; TypeScript interface ไม่ได้ตรวจ JSON ที่นำเข้า

ข้อเสนอเหล่านี้ต้องลงรายละเอียดก่อน implementation ไม่ใช่พฤติกรรมที่มีในโค้ดปัจจุบัน

## 4. ลำดับงานและจุดตรวจรับ

| ช่วง | สิ่งส่งมอบ | เกณฑ์ตรวจรับ | ทำหลัง |
|---|---|---|---|
| A: ปิด P0 | requirement IDs, schemas, mappings 3 ECU, wireframe และ topology demo | มี scenario ตัวอย่างที่รันซ้ำได้ และตรวจ config ผิดได้ | ยืนยันแนวทาง MVP |
| B: Core + decoder | encoder/decoder, ECU models, scheduler, deterministic scenario | payload ตัวอย่างได้ 48.0 V/80%; signed/endian ถูก; period และ reset ถูก | A |
| C: MVP ที่ทดลองได้ | controls, dashboard, monitor/filter, inspector, pause/reset, basic lesson | ผู้เรียนทำ W1–W4 ได้ และค่า UI ตรงกับเฟรม | B |
| D: พร้อมนำ MVP ไปทดลองสอน | offline loading, คู่มือทดลองและ QA | เปิดซ้ำ offline ตามขอบเขต cache ที่ตกลง; lesson ตัวอย่างครบองค์ประกอบ | C |
| E: P2 Teaching | เนื้อหา 8 หน่วย, quizzes/worksheets, CSV import/export/replay, instructor presets | ผู้สอนทำอย่างน้อย 6 workshops ได้ตาม handoff | D และตรวจเนื้อหาจากผู้สอน |
| F: P3 Advanced | DBC editor/import ที่ขยายความสามารถ, Fault Lab, timing analysis, assessment | ตรวจ signed/endian/timeout และ diagnosis ตาม fixture | E หรือจัดลำดับใหม่ตาม feedback |

DBC import แบบรองรับไฟล์ตัวอย่างควรกำหนดในขอบเขต MVP ให้ชัด เพราะ handoff ระบุเป็น core component
แต่ DBC editor อยู่ P3 หากเลื่อน import ออกจาก MVP ต้องบันทึกเป็นการเปลี่ยน scope ที่ตกลงกัน
เช่นเดียวกัน timeout และ CSV replay ปรากฏใน acceptance รวม แต่ไม่ได้หมายความว่าทั้งหมดต้องอยู่ P1

ไม่ผูกกำหนดส่งจากเอกสารเดิมโดยอัตโนมัติ: แผน 2 สัปดาห์ใน handoff เป็นเพียง estimate
ประเมินใหม่หลังตกลง scope และออกแบบ UI จากตัวอย่างที่ลูกค้าให้มา

## 5. Requirements และ acceptance ที่ต้องติดตาม

| ID | ข้อกำหนด/การตรวจรับ | ช่วงเสนอ |
|---|---|---|
| R01 | ควบคุม ignition/throttle/brake/SOC และสังเกตผลที่นิยามไว้ | B–C |
| R02 | ส่งเฟรม 0x180/0x280/0x380 ตาม period, timestamps ไม่ย้อนกลับ | B |
| R03 | 0x280: E0 01 50 00 00 00 00 00 → 48.0 V และ 80% พร้อมขั้นตอนคำนวณ | B–C |
| R04 | little/big endian, signed, factor/offset ผ่าน fixture ที่ตรวจคำตอบแล้ว | B |
| R05 | ปฏิเสธ ID/DLC/payload/overlap/config ผิด พร้อมข้อความเข้าใจได้ | A–B |
| R06 | pause หยุดสถานะ; scenario reset คืนค่าเริ่มต้นและให้ผลซ้ำเดิม | B–C |
| R07 | Monitor แสดง timestamp/channel/ID/IDE/DLC/hex/source/cycle พร้อม filter/sort | C |
| R08 | Lesson มี objective, instructor note, interaction และ knowledge check | C และ E |
| R09 | เพิ่ม content ผ่าน data files; เนื้อหา 8 หน่วยและ worksheets/quizzes | A และ E |
| R10 | BMS timeout ปรับ threshold ได้ และมี fault diagnosis | F |
| R11 | CSV import/export/replay รักษาลำดับและ decoded values | E |
| R12 | offline-capable บน browser เป้าหมาย ตามขอบเขต asset ที่ตกลง | D |
| R13 | ใช้ HTML เดิมเป็น UI reference สำหรับออกแบบ React UI โดยเลือกองค์ประกอบที่เหมาะกับการสอน CAN Bus | A–C |
| R14 | Education build ไม่มีการส่ง CAN ไป hardware จริง | ทุกช่วง |

R12–R13 รวมคำขอและคำชี้แจงล่าสุดในบทสนทนา ไม่ควรอ้างว่ามีรายละเอียดครบจาก handoff เพียงอย่างเดียว

## 6. เรื่องที่ต้องตกลงก่อนลงรายละเอียด

1. ภาษา: เสนอ UI ไทย + คำเทคนิคอังกฤษ; การสลับสองภาษาเป็น scope แยก
2. รุ่นทดลองแรก: เสนอ W1–W4 + บทเรียนตัวอย่าง 1 บท แล้วขยายครบหลักสูตร
3. UI reference: บทบาทไฟล์ HTML ตัดสินแล้วว่าเป็นตัวอย่าง; เลือก layout, controls และภาพประกอบที่จะนำมาใช้
   หลังศึกษาไฟล์ โดยไม่ถือว่าต้องใช้โค้ดหรือ asset ทั้งหมด และไม่ถือว่าต้องมี 3D ใน MVP
4. Offline: เสนอใช้งานหลังเปิดออนไลน์และ cache สำเร็จครั้งแรก; การติดตั้งแบบไม่เคยออนไลน์เป็นอีก requirement
5. อุปกรณ์: ต้องทราบ browser, ขนาดจอ และเครื่องที่ใช้สอนจริงก่อนกำหนด performance acceptance
6. แบบจำลอง EV: ลูกค้ายังไม่กำหนด max RPM, acceleration, brake response, SOC drain และ drive-enable rules
   ต้องนิยามเป็น training model และให้ผู้สอนตรวจ แทนการอ้างว่าเป็นพฤติกรรมรถจริง
7. DBC: กำหนด subset ของ import ที่ต้องรองรับใน MVP และแยก JSON signal map ออกจากไฟล์ .dbc จริง
8. Curriculum: เอกสารกล่าวถึงหลักสูตรต้นทาง 9 modules แต่เสนอ content map 8 units
   ต้อง mapping กับผู้สอน ไม่สมมติว่าหนึ่ง module เท่ากับหนึ่ง unit
9. คะแนน: เสนอเก็บในเครื่องก่อน; บัญชีผู้ใช้/LMS/Supabase ต้องนิยาม requirement เพิ่ม

## 7. วิธีทำงานร่วมกัน

- ผู้ใช้กำหนดลำดับความสำคัญ กลุ่มเรียนเป้าหมาย และประสานผู้สอนเพื่อตรวจความถูกต้องของเนื้อหา
- ผู้ช่วยแปลง requirement เป็นงานย่อย ออกแบบ/เขียนโค้ด ทดสอบ และอัปเดตเอกสารตามพฤติกรรมจริง
- แต่ละรอบส่งมอบเป็น flow ที่ลองได้ พร้อมขั้นตอนทดลอง ผลทดสอบ และข้อจำกัดที่ยังเหลือ
- หลังทดลอง รวบรวม feedback และปรับ scope/เกณฑ์ตรวจรับก่อนเริ่มรอบถัดไป
- ไม่ขออนุมัติซ้ำในรายละเอียด implementation ปกติ; ประเด็นที่เปลี่ยน scope หรือเนื้อหาวิชาการให้คุยก่อน

รอบแรกที่เสนอ: ปิดข้อกำหนด MVP, wireframe หน้า Virtual EV + Monitor,
schemas/mappings 3 ECU และ scenario drive ตัวอย่าง พร้อม acceptance checklist ก่อนเริ่มสร้าง engine
