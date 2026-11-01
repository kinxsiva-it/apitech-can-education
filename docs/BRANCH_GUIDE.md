# คู่มือ branch แยกตามหมวดงาน

ปรับปรุง: 1 พฤศจิกายน 2026

## โครงสร้างการทำงาน

- main: งานรวมที่ตรวจแล้ว ไม่แก้ UI ของหมวดต่าง ๆ โดยตรงบน main
- features/workspace-navigation: workspace กลาง เมนู ลำดับเมนู การเชื่อมหน้า และ layout ร่วม
- features/ui-*: งาน UI ของแต่ละเมนูตามตารางด้านล่าง

รอบนี้ทุก features/ui-* สร้างจาก commit เดียวกันบน features/workspace-navigation
จึงมีเมนูล่าสุดครบ และเป็น branch พี่น้อง ไม่ได้ต่อซ้อนงาน UI กัน
main ยังไม่รวม commit workspace รอบนี้ และยังไม่ได้ push branch ใหม่ขึ้น remote

## แก้หมวดไหน ให้ใช้ branch ไหน

| หมวดงาน | Branch | ไฟล์ปัจจุบัน / ตำแหน่งที่เสนอเมื่อเริ่มสร้าง |
|---|---|---|
| Workspace กลาง / เมนู / shared layout | features/workspace-navigation | src/App.tsx, src/ui/EducationWorkspace.tsx, src/ui/LabIcon.tsx, ส่วน CSS ร่วมใน src/index.css |
| CAN EDUCATION | features/ui-can-education | บทเรียนยังอยู่ใน EducationWorkspace.tsx; เสนอแยกเป็น src/ui/education/ และใช้ content/lessons/ |
| EV SYSTEM EXPLORER | features/ui-ev-system-explorer | src/ui/EvSystemExplorer.tsx |
| EV SIMULATION | features/ui-ev-simulation | src/ui/EvSimulation.tsx |
| EV COMPONENT LAB | features/ui-ev-component-lab | ยังเป็น placeholder; เสนอสร้าง src/ui/components-lab/ |
| CAN MONITOR | features/ui-can-monitor | ยังเป็น placeholder; เสนอสร้าง src/ui/can-monitor/ |
| SIGNAL & DBC LAB | features/ui-signal-dbc-lab | ยังเป็น placeholder; เสนอสร้าง src/ui/signal-dbc-lab/ |
| CAN FAULT LAB | features/ui-can-fault-lab | ยังเป็น placeholder; เสนอสร้าง src/ui/fault-lab/ |
| INSTRUCTOR WORKSPACE | features/ui-instructor-workspace | ยังเป็น placeholder; เสนอสร้าง src/ui/instructor/ |

ตำแหน่งที่ระบุว่าเสนอ ยังไม่ได้สร้างไฟล์หรือโฟลเดอร์ ไม่ถือว่าฟีเจอร์นั้นทำเสร็จแล้ว

## ขอบเขตที่ต้องแยกให้ชัด

- Explorer: ภาพรวมและการเชื่อมต่อของระบบ EV, เส้นทางพลังงานและ CAN
- Component Lab: ชิ้นส่วน EV รายชิ้น โครงสร้าง หน้าที่ ขั้วต่อ และสื่อประกอบสำหรับผู้สอน
- Simulation: controls, dashboard, scenario selection และการแสดงผลจาก engine ในอนาคต
- Monitor: raw frames, filter และ log
- Signal & DBC Lab: byte/bit inspection, signal mapping และการแสดงผล decoding
- Fault Lab: หน้าจอเลือก fault แสดงอาการและฝึกวินิจฉัย
- Instructor: presets, คำแนะนำผู้สอน เฉลย และผลประเมิน
- แบบทดสอบผู้เรียนให้อยู่ใน CAN Education ก่อน; คะแนนสำหรับผู้สอนอยู่ใน Instructor

UI branch อาจแก้ import และจุด render ใน EducationWorkspace.tsx เพื่อเชื่อมหน้าของตัวเองได้
แต่ถ้าเปลี่ยนชื่อ/ลำดับเมนูหรือ layout ที่มีผลกับทุกหน้า ให้ทำบน workspace branch
ไม่เปลี่ยนหน้าอื่นที่ไม่เกี่ยวข้องใน commit เดียวกัน

โค้ด pure TypeScript ใน src/simulator/ และ src/decoder/ รวมถึง logic ใน src/store/
เป็นงาน engine/data ไม่ใช่ UI ให้สร้าง branch งานเฉพาะจากฐานล่าสุดเมื่อต้องเริ่มทำ
เช่น features/can-scheduler หรือ features/signal-codec ไม่ใส่ engine ทั้งก้อนใน branch เมนูหนึ่ง

## ขั้นตอนเริ่มแก้ UI

ตรวจสถานะก่อนเปลี่ยน branch:

```powershell
git status
git switch features/ui-ev-component-lab
```

ตัวอย่างนี้ใช้ Component Lab; เปลี่ยนชื่อให้ตรงหมวดที่แก้
หากมีงานค้าง ให้ commit งานใน branch ที่ถูกต้องก่อน อย่าย้าย branch พร้อมงานค้างโดยไม่ตรวจ
เพราะ Git อาจพาการเปลี่ยนแปลงที่ยังไม่ commit ติดไปด้วย

ก่อนเริ่มงานแต่ละรอบ ให้รวม main ล่าสุดเข้ามาใน branch นั้น:

```powershell
git fetch origin
git merge origin/main
```

ถ้างานฐานที่จำเป็นยังอยู่ใน workspace branch และยังไม่เข้า main
ให้รวมฐานนั้นก่อนทำงาน:

```powershell
git merge features/workspace-navigation
```

การสร้าง branch ไม่ได้ทำให้ branch รับการเปลี่ยนแปลงจาก branch อื่นโดยอัตโนมัติ
ต้อง merge เพื่ออัปเดตฐาน และแก้ conflict ตามพฤติกรรมสุดท้ายที่ต้องการ
แนะนำใช้ merge ตามตัวอย่างก่อน เพื่อไม่ต้องเขียนประวัติ commit ใหม่

## Commit และส่งงาน

1. แก้เฉพาะหมวดที่รับผิดชอบ
2. ถ้าสร้าง component ใหม่ ให้แยก CSS ของหน้านั้นไว้ข้าง component แล้ว import
   ลดการแก้ src/index.css พร้อมกันหลายหมวด
3. ตรวจหน้าที่แก้และการสลับเมนูที่เกี่ยวข้อง แล้วรัน npm run build และ npm run lint
4. ใช้ git diff ตรวจ และ git add ระบุไฟล์ที่ต้องการขึ้น หลีกเลี่ยงการรวบไฟล์ที่ไม่เกี่ยวข้อง
5. Commit แยกตามผลลัพธ์ เช่น feat(ui): add EV component selector
6. เมื่อต้องส่งขึ้น remote ให้ push เฉพาะ branch ที่ต้องการ แล้ว review ก่อนรวมเข้า main
7. ถ้า UI branch อาศัย workspace ที่ยังไม่เข้า main ให้รวม workspace ก่อน แล้วค่อยรวม UI

ตัวอย่างคำสั่งเมื่อพร้อมส่ง branch:

```powershell
git push -u origin features/ui-ev-component-lab
```

หลังรวมงาน ถ้าจะใช้ branch เดิมต่อ ให้อัปเดตจาก main ก่อนรอบถัดไป

## Branch เก่าที่มีอยู่

features/setup-project, features/simulation-foundation, features/requirements-plan,
features/education-workspace, features/ev-system-explorer และ features/ev-simulation
เป็น branch จากการแบ่ง commit รอบแรก งานเหล่านี้รวมเข้า main แล้ว
เก็บไว้เป็นประวัติได้ แต่สำหรับงานใหม่ให้ใช้ features/ui-* ตามตาราง
เพราะ branch เก่าชี้ไปยังฐานก่อน workspace รอบนี้

## ไฟล์ที่ไม่ขึ้น Git

node_modules/, dist/, .codex-vite-scaffold/, ไฟล์ .env จริง, HTML ตัวอย่างขนาดใหญ่
และ scaffold เก่าที่ .gitignore ระบุ ยังคงไม่รวมใน commit
ไม่ commit credential หรือไฟล์ build เพิ่มเมื่อสลับหมวด
