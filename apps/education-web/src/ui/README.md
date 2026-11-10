# โครงสร้าง UI

โฟลเดอร์นี้อยู่ใน `apps/education-web/src/ui/` แล้ว path `src/`, `public/` และ `tests/` ในคู่มือนี้ให้อ่านจาก root ของแอป Education
Admin CMS อยู่ `apps/admin-web/` และ NestJS อยู่ `apps/api/` ไม่วางโค้ดสองส่วนนี้ใน UI ของ Education

แบ่งตามหมวดที่ผู้ใช้เห็น ส่วน logic จำลอง CAN และ decoder ยังคงอยู่ใน
src/simulator/, src/decoder/ และ src/store/ ตามเดิม

```text
ui/
├── workspace/
│   ├── EducationWorkspace.tsx       # shell, header, menu, การประกอบหน้า
│   └── navigation.ts                # ชื่อ/ลำดับ/หัวข้อเมนู
├── shared/
│   └── icons/
│       └── LabIcon.tsx               # ไอคอนที่ใช้ร่วมกัน
├── education/
│   ├── CanEducation.tsx             # หน้าบทเรียน
│   └── topics.ts                    # หัวข้อบทเรียน
├── ev-system-explorer/
│   └── EvSystemExplorer.tsx         # ภาพรวมระบบ EV
├── ev-simulation/
│   └── EvSimulation.tsx             # หน้า input/dashboard จำลอง
├── components-lab/
│   ├── EvComponentLab.tsx           # หน้าเลือกหมวดชิ้นส่วน
│   ├── data/
│   │   └── parts.ts                 # เนื้อหาชิ้นส่วนและคำถาม
│   ├── diagrams/
│   │   └── ComponentDiagram.tsx     # ภาพ SVG
│   ├── motor-procedural/
│   │   └── Motor3D.tsx              # มอเตอร์สร้างด้วยโค้ด
│   ├── motor-glb/
│   │   ├── MotorGlbPreview.tsx      # UI ของ GLB viewer
│   │   ├── MotorModel.tsx           # โหลด scene และเชื่อม state
│   │   ├── MotorCameraRig.tsx       # กล้องและ controls
│   │   ├── motor-view-config.ts     # โหมด, offsets, กลุ่ม
│   │   ├── motor-model-state.ts     # baseline, visibility, highlight
│   │   └── motor-component-info.ts  # คำอธิบายรายชิ้น
│   └── styles/
│       └── component-lab.css        # styles ของ Component Lab
└── legacy/                          # ไฟล์เก่าในเครื่อง, ignored จาก Git
    ├── Dashboard.tsx
    └── VehicleScene.tsx
```

## แก้อะไร ไปที่ไหน

- เปลี่ยนชื่อหรือลำดับเมนู: workspace/navigation.ts
- เปลี่ยนการนำทาง/header/footer: workspace/EducationWorkspace.tsx
- เปลี่ยนบทเรียนเริ่มต้น: education/CanEducation.tsx และ education/topics.ts
- เปลี่ยนหน้าจำลอง: ev-simulation/
- เปลี่ยนภาพรวมระบบ: ev-system-explorer/
- เปลี่ยนมอเตอร์จาก GLB: components-lab/motor-glb/
- เปลี่ยนมอเตอร์ที่สร้างด้วยโค้ด: components-lab/motor-procedural/
- เปลี่ยนเนื้อหาชิ้นส่วน: components-lab/data/parts.ts
- แก้ไอคอนร่วม: shared/icons/LabIcon.tsx

src/App.tsx เรียก workspace/EducationWorkspace.tsx
หัวข้อ Education ที่เลือกยังเก็บใน workspace แล้วส่งผ่าน props เพื่อคง state ขณะสลับเมนู
ไม่สร้างโฟลเดอร์ว่างรอเมนูที่ยังเป็น placeholder; สร้างเมื่อเริ่มงานจริง

src/index.css ยังเป็น entry ของ CSS เดิม รวมกฎร่วมและกฎหน้าเก่าบางส่วน
รอบนี้ไม่ได้แยกกฎเหล่านั้นใหม่ เพื่อรักษาลำดับ cascade และหน้าตาเดิม
ไฟล์ GLB และ HTML อ้างอิงอยู่ใน public/assets/ ตามเดิม ไม่ย้ายเข้ามาใน UI
tests/motor-model.test.ts อ้างอิงโมดูลจาก components-lab/motor-glb/

การจัดโฟลเดอร์นี้ไม่เพิ่ม dependency และไม่เปลี่ยนสัญญาการทำงานของ simulator
