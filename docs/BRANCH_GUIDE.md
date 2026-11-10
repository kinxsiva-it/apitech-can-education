# คู่มือ branch และการแบ่งขอบเขตงาน

ปรับปรุง: 1 พฤศจิกายน 2026

## แนวทางหลัก

ใช้ main เป็นฐานของงานที่ตรวจแล้ว และเปิด features/<ชื่องาน> เฉพาะงานที่กำลังทำ
ปกติทำครั้งละหนึ่ง feature branch เมื่อเสร็จให้ตรวจ รวมเข้า main แล้วลบ branch
ยังไม่ใช้ develop และไม่สร้าง branch ถาวรรอไว้ทุกเมนู

จำนวน branch ไม่ใช่สาเหตุของ conflict โดยตรง ความเสี่ยงอยู่ที่การแก้ไฟล์เดียวกัน
บนหลาย branch และปล่อยให้ฐานโค้ดต่างกันนาน จึงควรแบ่งงานเล็กและรวมงานสม่ำเสมอ

## กลุ่มงานและตำแหน่งโค้ด

ตำแหน่ง UI ล่าสุดดูที่ [คู่มือโฟลเดอร์ UI](../src/ui/README.md):
workspace/ สำหรับ shell และเมนู, education/ สำหรับบทเรียน,
shared/icons/ สำหรับไอคอนร่วม และแต่ละหมวดมีโฟลเดอร์ของตัวเอง
Motor GLB อยู่ใน components-lab/motor-glb/ แยกจาก motor-procedural/ และ diagrams/

ตารางนี้ระบุขอบเขตความรับผิดชอบและตัวอย่างชื่อ branch ไม่ใช่รายการ branch ที่ต้องสร้างพร้อมกัน

| กลุ่ม | ขอบเขต / ตำแหน่งปัจจุบัน | ตัวอย่าง branch เมื่อเริ่มงาน |
|---|---|---|
| Workspace | เมนู การประกอบหน้า App.tsx, EducationWorkspace.tsx และ shared layout | features/workspace-navigation |
| Simulation core | src/simulator/, ECU, scheduler, scenarios และ adapter เชื่อม store | features/can-scheduler |
| Signal processing | src/decoder/, encode/decode, validation, DBC และ mapping ใน content/dbc/ | features/signal-codec |
| EV learning UI | EvSystemExplorer.tsx, EvSimulation.tsx และหน้า Component Lab ที่จะสร้าง | features/ev-component-lab |
| CAN tools UI | Monitor, Frame Inspector และ Signal & DBC Lab ซึ่งยังเป็น placeholder | features/can-monitor |
| Teaching | บทเรียนใน EducationWorkspace.tsx, content/lessons/, quizzes และ Instructor | features/lesson-player |

เลือก branch ตามผลลัพธ์ของงาน เช่น แก้หน้าปัด Simulation ใช้ features/ev-dashboard
ไม่จำเป็นต้องรวม Explorer และ Component Lab ในงานเดียวเพียงเพราะอยู่กลุ่มเดียวกัน

## ขอบเขตแต่ละหน้า

- CAN Education: บทเรียน กิจกรรม และแบบทดสอบผู้เรียน
- EV System Explorer: ภาพรวมการเชื่อมต่อของ EV เส้นทางพลังงานและ CAN
- EV Component Lab: ชิ้นส่วนรายชิ้น โครงสร้าง หน้าที่ ขั้วต่อ และสื่อสำหรับผู้สอน
- EV Simulation: controls, dashboard และ scenario selection
- CAN Monitor: raw frames, filters และ log
- Signal & DBC Lab: bytes/bits, signal definitions และ decoded values
- CAN Fault Lab: เลือก fault ดูอาการและฝึกวินิจฉัย
- Instructor Workspace: presets, notes, เฉลย และผลประเมิน

หน้าที่ยังเป็น placeholder ไม่ถือว่าพัฒนาเสร็จแล้ว

## ลำดับ dependencies

1. กำหนด types และ data contracts
2. พัฒนา core/decoder ที่จำเป็น ทดสอบ และรวมเข้า main
3. ทำ adapter เชื่อม engine กับ store
4. พัฒนา UI ที่ใช้ข้อมูลจริงจากฐานดังกล่าว

UI mockup ทำก่อนได้ แต่ต้องระบุว่าเป็น preview และยังไม่คำนวณ telemetry
Foundation ปัจจุบันรวมเข้า main แล้ว แต่ยังมีเพียง clock, types, store และ configuration
จึงไม่ถือว่า simulation engine สมบูรณ์

หาก UI ต้องใช้ foundation ใหม่ ให้รวม foundation เข้า main ก่อนแตก branch UI
ใช้ stacked branches เฉพาะเมื่อจำเป็น และระบุว่าขึ้นกับ branch ใด ไม่ใช้เป็นวิธีหลัก

## เริ่มงานใหม่

ตรวจให้ไม่มีงานค้างก่อนเปลี่ยน branch แล้วเริ่มจาก main ล่าสุด:

```powershell
git status
git switch main
git fetch origin
git merge --ff-only origin/main
git switch -c features/ev-component-lab
```

หาก main ในเครื่องมี commit ที่ยังไม่ push ให้คง commit เหล่านั้นไว้ด้วย
ถ้า merge --ff-only ล้มเหลว ให้ตรวจประวัติและแก้การแตกสายก่อน ไม่ใช้ reset หรือ force push เพื่อข้ามปัญหา

ถ้า feature branch เปิดอยู่และ main มีงานใหม่ ให้ตรวจ working tree แล้วอัปเดตด้วย:

```powershell
git fetch origin
git switch main
git merge --ff-only origin/main
git switch features/ev-component-lab
git merge main
```

ตัวอย่างชื่อใช้ Component Lab ให้เปลี่ยนเป็นงานที่กำลังทำจริง
หากมีงานค้าง ให้ commit ใน branch ที่ถูกต้องก่อน Git อาจพางานที่ไม่ commit ติดไปตอนสลับ branch

## ลด merge conflicts

- ให้ EducationWorkspace.tsx เน้นประกอบหน้าและนำทาง ค่อยแยกเนื้อหาแต่ละหน้าเมื่อเริ่มแก้หมวดนั้น
- แยก CSS ของหน้าที่พัฒนาไว้ข้าง component แล้ว import; index.css เก็บสไตล์ร่วม
- LabIcon.tsx และเมนูเป็นไฟล์ร่วม ต้องตรวจผลกระทบต่อหน้าอื่น
- UI branch แก้ import/จุด render เพื่อเชื่อมหน้าของตัวเองได้ โดยไม่เปลี่ยนหน้าอื่นนอกขอบเขต
- แยก commit ตามผลลัพธ์ และตรวจ diff ก่อน stage
- จำนวน branch ที่แนะนำ: main + feature ที่กำลังทำหนึ่งเส้น ถ้าจำเป็นจริงค่อยเปิดงานอิสระเพิ่ม

แนวทางแยก component/CSS เป็นงานปรับโครงสร้างในอนาคต รอบจัด branch นี้ยังไม่ได้ย้ายโค้ด UI

## จบงานและรวมเข้า main

ตรวจหน้าที่แก้และเมนูที่เกี่ยวข้อง รัน npm run build และ npm run lint แล้ว commit เฉพาะไฟล์งานนั้น
ถ้า main เดินหน้าไปแล้ว ให้ merge main เข้า feature และตรวจใหม่ก่อนรวม

ตัวอย่างสำหรับงานที่ review แล้วและ main ไม่ได้แยกสาย:

```powershell
git switch main
git merge --ff-only features/ev-component-lab
git branch -d features/ev-component-lab
```

ถ้าทำงานผ่าน GitHub ให้ push feature แล้ว review/merge ด้วย PR แทนขั้นตอน merge ในเครื่อง
หลังจากนั้น fetch และอัปเดต main ในเครื่องก่อนลบ local branch
หาก -d ปฏิเสธ ให้ตรวจว่ามี commit ที่ยังไม่รวม ห้ามเปลี่ยนเป็น -D โดยไม่ตรวจงาน
การลบชื่อ branch ไม่ได้ลบ commit ที่ main อ้างถึง จึงยังดูประวัติงานได้

การ push ขึ้น remote ทำเมื่อผู้ใช้สั่งหรืออนุญาตในงานนั้น ไม่ถือว่าคำสั่งตัวอย่างเป็นการอนุมัติ push

## การจัดระเบียบรอบนี้

- รวม workspace navigation และคู่มือฉบับนี้เข้า main ในเครื่อง
- ลบ branch รอบเก่าที่งานรวมใน main แล้ว และ features/ui-* ที่ยังไม่มีงานเฉพาะ
- เปิด features/ev-component-lab จาก main ล่าสุดสำหรับงานถัดไป ยังไม่เริ่มสร้าง UI ในรอบจัด branch
- ยังไม่ push การเปลี่ยนแปลงรอบนี้ขึ้น remote

## เริ่มงานระบบสมาชิก (10 พฤศจิกายน 2026)

- ใช้ `features/member-access-foundation` สำหรับ schema, migrations และ RLS ของระบบสมาชิก ตาม `MEMBERSHIP_CMS_AGREEMENTS.md`
- Branch นี้ต่อจาก `features/ev-component-lab` ซึ่งมีฐาน UI ล่าสุดและ commits งาน export HTML, เอกสารข้อตกลง และ Supabase client แล้ว
- ยังไม่ได้รวมงานเหล่านี้เข้า `main` หรือ Push ในรอบจัดงานนี้ จึงเป็น branch ที่มี dependency กับงาน Component Lab เดิม ไม่ใช่การพัฒนาสอง feature พร้อมกัน
- หยุดพัฒนาบน branch Component Lab เดิม ใช้ branch สมาชิกสำหรับงานถัดไป
- ก่อนรวม branch สมาชิก ให้ตรวจและรวม commits ฐานเดิมด้วย หรือรวม branch ฐานเข้า main ก่อน ไม่ต้อง cherry-pick commits ซ้ำ
- `.env.local` เก็บเฉพาะในเครื่อง ส่วน `.env.example` ใช้ค่าตัวอย่างและเก็บใน Git ได้

## ไฟล์ที่ไม่ขึ้น Git

node_modules/, dist/, .codex-vite-scaffold/, ไฟล์ .env จริง, HTML ตัวอย่างขนาดใหญ่
และ scaffold เก่าที่ .gitignore ระบุ ไม่รวมใน commit
