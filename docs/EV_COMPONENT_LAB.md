# EV Component Lab — UI รอบแรก

?????? monorepo: source ???? apps/education-web/ ???? ??????????????? build/lint ???? ??? motor tests 6 ????????
??????????????? geometry ???????? Viewer ??????????????????????? browser ?????????????
????????????????????????????????????????????????????????

Branch: features/ev-component-lab

## ขอบเขต

หน้าแสดงชิ้นส่วน EV สำหรับการสอน แยกจาก System Explorer ที่แสดงภาพรวมทั้งระบบ
จัด layout เป็นรายการชิ้นส่วน / ภาพประกอบแยกชั้น / คำอธิบายและคำถามสำหรับผู้สอน

มี Battery pack, BMS, VCU, Inverter/Controller, Motor และ CAN wiring
เนื้อหา CAN อ้างอิง training IDs และ mappings ใน customer handoff:
0x180 Motor Controller, 0x280 BMS, 0x380 VCU
ไม่มี OEM mapping หรือ pinout ของรถจริง

## ไฟล์

- apps/education-web/src/ui/components-lab/motor-procedural/Motor3D.tsx: มอเตอร์ 3D ที่สร้างด้วยโค้ด (ช่อง ELECTRIC MOTOR)
- apps/education-web/src/ui/components-lab/motor-glb/MotorGlbPreview.tsx: ช่องนำเข้า GLB แยกสำหรับเปรียบเทียบ

- apps/education-web/src/ui/components-lab/EvComponentLab.tsx: state และ UI ของหน้า
- apps/education-web/src/ui/components-lab/diagrams/ComponentDiagram.tsx: ภาพ SVG และการเลือกชั้น
- apps/education-web/src/ui/components-lab/data/parts.ts: เนื้อหาชิ้นส่วนและคำถาม/แนวคำตอบ
- apps/education-web/src/ui/components-lab/styles/component-lab.css: สไตล์เฉพาะหน้าและ responsive layout
- apps/education-web/src/ui/workspace/EducationWorkspace.tsx: เชื่อมเมนู components เข้าหน้าใหม่

## สิ่งที่ทดลองได้

1. เลือกเมนู EV COMPONENT LAB และเปลี่ยนชิ้นส่วนทั้ง 6 หมวด
2. ตรวจว่าภาพ ชื่อ ข้อมูล connections และ CAN learning link เปลี่ยนตามชิ้นส่วน
3. เลือก PART BREAKDOWN หรือกดชั้นในภาพ แล้วตรวจ Selected part
4. ใช้ Tab ไปยังชั้นในภาพและ Enter/Space เพื่อเลือก
5. สลับ Exploded/Assembled view, เปิด/ปิด Layer markers และซูม 80–160%
6. Reset view คืนค่าการแสดงผล โดยไม่เปลี่ยนชิ้นส่วนที่เลือก
7. เปิด/ซ่อนแนวคำตอบ แล้วเลือกชิ้นส่วนใหม่ ตรวจว่าเฉลยปิดกลับ
8. ทดลองจอแคบ: รายการชิ้นส่วนเลื่อนแนวนอน และแผงข้อมูลเรียงลงด้านล่าง
9. สลับกลับ Education / Explorer / Simulation เพื่อตรวจการนำทางเดิม

รายการด้านบนเป็น checklist สำหรับตรวจบน browser ไม่ใช่รายงานว่าทดสอบผ่านทุกข้อแล้ว

## Motor GLB Explorer — ปรับปรุง interaction

ยังใช้ apps/education-web/public/assets/models/motorglb/ev-ipmsm-motor.glb เดิม ไม่แก้ geometry, ชื่อ Node,
วัสดุต้นฉบับ หรือเอกสาร SolidCraft ของผู้ใช้ ตรวจ JSON ของ GLB และ hierarchy ก่อนแก้:
63 mesh ภายใต้ 10 Group; metadata: units=m, upAxis=Y, motorAxis=X
แปลง source delta ด้วย [x,y,z] mm → [x,z,-y] / 1000 m

### ไฟล์ของ viewer

- MotorGlbPreview.tsx: ปุ่มโหมด, group legend, selection และ information panel
- MotorModel.tsx: useGLTF, private scene instance, event picking, mode/highlight effects
- motor-model-state.ts: cache ของ mesh references, baseline, bounds และ material clones
- motor-view-config.ts: visibility lists, compact offsets, legend group mapping
- motor-component-info.ts: ชื่อไทย/หน้าที่ที่ map กับชื่อจริง; ไม่อ้างเกรดวัสดุจากสี
- MotorCameraRig.tsx: fit/reset จาก bounds, zoom limits, pan limits และ responsive camera
- component-lab.css: styles จำกัดเฉพาะ Motor GLB โดยไม่เปลี่ยนธีมหน้าอื่น

### โหมด

Assembled คืน position/quaternion/scale/matrix/visibility จาก baseline
กดปุ่มนี้จะล้าง selection, extra detail และกลุ่มที่ซ่อนเพิ่มเติม เพื่อคืนภาพประกอบครบ 63 ชิ้น

Cutaway มาตรฐานซ่อนตัวเรือน/ครีบ/ฝาครอบ 21 ชิ้น เหลือ 42 ชิ้น
ตัวเลือก More internal detail ซ่อน StatorAccessQuarter และ StatorLowerQuarter
เพิ่มอีก 2 ชิ้น เหลือ 40 แต่คง RotorCore ไว้ แม่เหล็กจึงไม่ถูกแสดงลอยออกจากแกน
แม่เหล็กบางส่วนอาจยังถูกบังตาม geometry จริง การซ่อนนี้ไม่ใช่ clipping/Boolean section

Exploded ปรับ delta สำหรับ UI ให้กระชับกว่า offsets เดิมใน companion document:
- RearEndCover: X −45 mm; RearBearing: X −22 mm
- Stator ทั้ง 3 ชิ้น: X +100 mm; Windings ทั้ง 24 ชิ้น: X +195 mm
- RotorCore/Shaft/Shoulder/Key และ Magnets: X +310 mm เท่ากัน เพื่อรักษาตำแหน่งแม่เหล็กในแกน
- FrontBearing: X +400 mm; Front covers: X +430 mm
- MountingFoot ยังคง source Z −45 mm (GLB Y −0.045 m)
- Housing/ribs 18 ชิ้นคงที่

ค่าเหล่านี้เป็น teaching layout ใหม่ในโค้ด ไม่ได้เขียนทับ source document
ยังมี 45 ชิ้นเคลื่อนที่และ 18 ชิ้นคงที่ ค่าขอบเขต X ที่คาดหวังคือ −0.105 ถึง 0.490 m
ไม่ได้รันตรวจค่าคาดหวังรอบนี้ และไม่ได้อ้างว่าเป็นเส้นทางถอดประกอบจริง
เพลายาวอาจพาดผ่าน axial station อื่นตามรูปทรงเดิม ห้ามตีความว่าเป็นการตรวจ interference

### Selection / legend

คลิก mesh เมื่อ pointer เคลื่อนไม่เกินเกณฑ์ หรือเลือกผ่าน dropdown ใต้ legend
จะแสดงชื่อเดิม/ชื่อไทย/กลุ่ม/หน้าที่/ข้อมูล material เท่าที่มี
GLB เก็บ appearance แบบประมาณ ไม่ใช่ข้อมูลเกรดโลหะ
ชื่อที่ยังไม่มี metadata แสดงข้อความว่ายังไม่มีข้อมูลเพิ่มเติม

Legend รวมกลุ่มจาก parent names จริง: Housing & Cooling, Stator & Windings,
Rotor & Magnets, Shaft & Bearings และ Covers & Mounting
จำนวนสมาชิกมาจากโมเดลที่โหลด ไม่แสดงรายการ 63 แถวเป็นค่าเริ่มต้น
จำนวนแสดงหมายถึง visibility flags ไม่ใช่จำนวนชิ้นที่มองเห็นจากมุมกล้องโดยไม่ถูกบัง

เลือกกลุ่มเพื่อ highlight; checkbox ซ่อนเพิ่มเติมจาก visibility ของโหมด
ไม่สามารถเปิดชิ้นที่โหมดหลักซ่อนไว้ด้วย checkbox นี้
เปลี่ยนโหมดจะล้าง hidden groups/extra detail/selection
Restore mode visibility คืนค่า visibility มาตรฐานของโหมดโดยไม่เปลี่ยนโหมด
Reset view คืนเฉพาะกล้อง/target โดยไม่โหลดไฟล์ และไม่แก้ selection/visibility

Highlight ใช้ material clones แบบ lazy และ cache ต่อ mesh
ล้าง selection แล้วคืน original material references และ dispose clones เมื่อ unmount
ไม่ dispose geometry หรือ material ของ useGLTF cache
ไม่มี React state update ราย frame และไม่โหลด GLB ใหม่เมื่อสลับโหมด

### จุดที่ผู้ใช้ต้องตรวจบน browser

1. ทั้ง 3 โหมดและการกลับ Assembled ซ้ำ ๆ ต้องไม่สะสม offset/visibility
2. Cutaway extra detail เปิด/ปิดโดยโหมดไม่เปลี่ยน RotorCore ต้องยังอยู่
3. ระยะ Exploded ใหม่ ช่องว่าง และความสัมพันธ์ของเพลา/แบริ่งเหมาะกับการสอนหรือไม่
4. คลิกกับลากหมุนต้องแยกกัน; highlight ต้องไม่เปลี่ยน material ชิ้นอื่นที่แชร์กัน
5. เลือกกลุ่ม/ชิ้นย่อย ล้าง selection และซ่อน/แสดงกลุ่ม รวมถึงซ่อนทั้งหมดแล้ว restore
6. Reset view, ขอบเขต zoom/pan และการจัดกล้องหลัง resize ทั้ง desktop/mobile
7. แสงและสีเทียบไฟล์เดิม รายละเอียดที่ยังถูกบังโดย geometry
8. Network ไม่ควรโหลด GLB ใหม่เมื่อสลับโหมด; Reload file เป็นคำสั่งโหลดใหม่โดยชัดเจน

ตามคำสั่งผู้ใช้ รอบนี้ไม่ได้รัน test suite, typecheck, lint, build หรือ browser smoke test
ปรับค่าคาดหวังใน apps/education-web/tests/motor-model.test.ts ให้ตรงกับ cutaway/offsets ใหม่แล้ว แต่ยังไม่ได้รัน
ยังไม่ได้ commit/push

## ข้อจำกัด

- ภาพ SVG เป็น schematic สำหรับสื่อสารแนวคิด ไม่ใช่ CAD หรือแบบประกอบตามสัดส่วน
- ELECTRIC MOTOR มีตัวอย่าง React Three Fiber ให้เปรียบเทียบกับ SVG
  เป็นมอเตอร์ทั่วไปที่สร้างจากรูปทรงพื้นฐาน ไม่มีการยืนยันความตรงกับรุ่นจริง
- Battery, BMS, VCU และ Inverter ใช้รูปทรงกล่องประกอบทั่วไปต่างกันตามส่วนที่เน้น
  ไม่ได้อ้างว่าเป็นรายละเอียดทางกายภาพของชิ้นส่วนรุ่นใด
- Layer markers ใช้หมายเลขที่ตรงกับรายการ PART BREAKDOWN
- ไม่มีการจำลองทางไฟฟ้า/กลไก ไม่มี telemetry จริง และยังไม่เชื่อม engine/store
- คำอธิบายชิ้นส่วนเป็นเนื้อหาร่างสำหรับให้ผู้สอนตรวจ ก่อนใช้เป็นบทเรียนฉบับส่งมอบ
- รอบปรับ Motor GLB Explorer ล่าสุดยังไม่ได้รันการตรวจหรือเปิด browser ตามคำสั่งผู้ใช้
  ต้องตรวจภาพ interaction และ responsive layout ด้วยตนเองก่อนนำไปใช้งาน

ขั้นถัดไป: ทดลอง UI ร่วมกัน ปรับรายละเอียดชิ้นส่วนตาม feedback ผู้สอน
และตกลงว่าชิ้นใดต้องใช้โมเดล 3D จริงก่อนเริ่มจัดหา/สร้าง asset
