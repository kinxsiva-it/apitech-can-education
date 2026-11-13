# ทดสอบอีเมลยืนยันและสมาชิกครั้งแรก

หากไม่สะดวกกรอกรหัสผ่านใน Terminal ใช้ [Postman Collection และคู่มือ](../tools/postman/README.md) แทนได้ โดยเริ่ม Login สำหรับบัญชีที่ยืนยันอีเมลแล้ว

คำสั่งชุดนี้ส่งคำขอ signup จริงเมื่อผู้ใช้รันและกรอกข้อมูลใน Terminal
ไม่ใช่ automated tests ที่สร้างข้อมูลให้เอง และไม่รันรวมใน test:api/test:db
รหัสผ่านถูกซ่อนขณะพิมพ์ ไม่รับผ่าน command arguments ไม่เขียนลงไฟล์ และไม่แสดง token
ใช้ชื่อทดสอบและอีเมลที่คุณควบคุมได้ โดยอีเมลต้องยังไม่เคยสมัครเป็น application user ของ Project นี้

## 1. เตรียมอีเมลและปลายทาง

- ใน Supabase Authentication → SMTP Settings ให้ใช้ default SMTP ก่อน หากยังไม่มีค่าบริการ SMTP จริง
- Default SMTP อนุญาตอีเมลสมาชิกทีม Supabase ใช้อีเมลเดียวกับบัญชี Supabase ของเจ้าของ Project สำหรับรอบแรก
- คง Confirm email เปิดอยู่
- เปิด Authentication → URL Configuration ของ Project `zkhrylfgslbcgcwhdmpt`
- ตั้ง Site URL เป็น `http://localhost:5173` และเพิ่ม Redirect URL `http://localhost:5173` แล้วบันทึก
- นี่เป็นค่าเครื่องพัฒนาชั่วคราว ก่อน deploy ต้องใช้ URL เว็บจริงตาม environment

อีเมลที่ Login Supabase Dashboard ไม่ได้กลายเป็นบัญชีอาจารย์ในเว็บเราโดยอัตโนมัติ จึงใช้อีเมลเดียวกันสมัครทดสอบได้
ไม่ต้องเชิญอีเมลคนอื่นเป็นสมาชิกทีม Supabase เพื่อทดสอบ เพราะสมาชิกทีมมีสิทธิ์จัดการ Project ตามบทบาทของทีม

## 2. เปิดแอปในเครื่อง

ที่ root ของ repo เปิด VS Code → Terminal → New Terminal:

```powershell
npm run dev:all
```

ให้ Terminal นี้รันค้างไว้ จากนั้นเปิด Terminal ใหม่อีกช่องเพื่อกรอกคำสั่งทดสอบ

## 3. สมัคร

```powershell
npm run test:auth:signup
```

กรอก Full name, Email, Password และ Confirm password
ขณะพิมพ์รหัสผ่านจะไม่เห็นตัวอักษร ให้พิมพ์ตามปกติแล้ว Enter ไม่ต้องส่งรหัสผ่านในแชต
ใช้รหัสผ่านทดสอบอย่างน้อย 8 ตัวอักษร ไม่ใช้รหัสผ่านเดียวกับบัญชี Supabase Dashboard

เมื่อระบบรับคำขอแล้ว ให้เปิด Inbox/Spam ของอีเมลนั้นและกดลิงก์ Confirm your email
ลิงก์ควรกลับมาที่ localhost:5173 โดยเว็บยังเป็นหน้า Education เดิม ไม่ใช่หน้าผลการยืนยัน/login ที่สมบูรณ์

## 4. ตรวจหลังยืนยัน

```powershell
npm run test:auth:status
```

กรอกอีเมลและรหัสผ่านทดสอบเดิม คำสั่งจะ Login ผ่าน Auth แล้วเรียก NestJS ที่ 127.0.0.1:3000
ผลที่คาดหวัง: role=instructor, status=pending, email_confirmed=true, can_access_education=false และ request_round=1
คำสั่งออกจาก session ของตัวเองเมื่อเสร็จ ไม่ลบบัญชีและไม่เก็บ session ไว้ในไฟล์
บัญชีจะยังไม่ผ่านอนุมัติ จนกว่า Dev เตรียมบัญชี Admin และทดสอบขั้นพิจารณาต่อ

## ปัญหาที่อาจพบ

- invalid_credentials: Auth ไม่ยอมรับอีเมลหรือรหัสผ่าน ให้ใช้รหัสผ่านที่ตั้งตอน signup ของเว็บนี้ ตรวจภาษาแป้นพิมพ์/Caps Lock ไม่ใช่ปัญหา SMTP หรือ Members API และการสมัครซ้ำไม่ใช่การรีเซ็ตรหัสผ่าน
- หากจำรหัสผ่านไม่ได้ ต้องใช้ขั้นตอนกู้คืนรหัสผ่านที่ผู้ใช้ควบคุมเอง สคริปต์ปัจจุบันยังไม่มีโหมด recovery ไม่ต้องส่งรหัสผ่านในแชต
- email_not_confirmed: ยังไม่ได้กดยืนยัน หรือเปิดลิงก์ไม่สำเร็จ
- email_address_not_authorized: default SMTP ไม่อนุญาตผู้รับ ให้ใช้อีเมลสมาชิกทีมของ Project
- over_email_send_rate_limit: รอรอบส่งเมล ไม่กดสมัครซ้ำถี่ ๆ
- Auth ส่งเมลไม่ได้: ตรวจว่าไม่ได้เปิด Custom SMTP ค้างพร้อมค่าว่าง และผู้รับถูกอนุญาต
- API ติดต่อไม่ได้: ตรวจว่า dev:all ยังรันอยู่และ API ใช้พอร์ต 3000
- รหัส 409/503 จาก API: ตรวจ migrations/config และสถานะข้อมูลก่อน ไม่แก้ role/status ใน browser เอง

ตรวจ config โดยไม่ส่งเมล/สร้างข้อมูลได้ด้วย `npm run test:auth:signup -- --check`
ไม่มีอีเมลแจ้งผลอนุมัติจริงในขั้นนี้ เพราะ email worker ยังไม่ได้ทำ
