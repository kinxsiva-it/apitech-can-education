# ตั้งรหัสผ่าน Admin ใหม่โดย Dev

สำหรับบัญชี application Admin ที่ Dev จัดการ ไม่ใช่การเปลี่ยนรหัสผ่าน Supabase Dashboard
ไม่มี endpoint reset แบบข้าม authentication เพิ่มในเว็บหรือ API

รันจาก root ใน Terminal ของตัวเอง:

```powershell
npm run dev:reset-admin-password
```

เครื่องมือนี้อ่าน Project และ DEV_ADMIN_USER_ID/DEV_ADMIN_EMAIL จาก apps/api/.env.local ซึ่งเตรียมเป้าหมายไว้ในเครื่องแล้ว
ต้อง Login Supabase CLI ด้วยบัญชีเจ้าของ Project หรือบัญชี Dev ที่มีสิทธิ์อ่าน Admin key
เครื่องมืออ่าน key ของ Project ผ่าน CLI ใน memory โดยไม่พิมพ์/เขียน key ลงไฟล์
ตรวจว่า UUID/email ตรงกัน ยืนยันอีเมลแล้ว และ role=admin/status=approved ก่อนให้ตั้งรหัส

กรอก New Admin password และ Confirm new password ขณะพิมพ์จะไม่เห็นตัวอักษร
ใช้รหัสใหม่อย่างน้อย 8 ตัวอักษรและไม่เกิน 72 UTF-8 bytes ไม่ส่งรหัสผ่านในแชต/arguments
จะเรียก Supabase Auth Admin API เพื่อเปลี่ยนเฉพาะ password ของเป้าหมาย ไม่แก้ hash ตรงในฐานข้อมูลและไม่เปลี่ยน role/status
หลังสำเร็จจะเพิ่ม application audit event ชื่อ admin.password_reset_by_dev โดยไม่เก็บ password/key
การเปลี่ยน Auth password กับการเพิ่ม application audit เป็นคนละคำขอ หาก audit ล้มเหลวจะรายงานว่ารหัสเปลี่ยนสำเร็จแล้วและให้ตรวจ Auth audit logs

จากนั้นเปิด Postman → Environment APITech Local → แก้ admin_password เป็นรหัสใหม่ แล้ว Send Login Admin ใหม่เพื่อรับ tokens ชุดใหม่
ไม่ต้องคัดลอก service_role/secret key ไป Postman หรือ Frontend

เช็ก config โดยไม่อ่าน key/ไม่เปลี่ยนรหัสได้ด้วย:

```powershell
npm run dev:reset-admin-password -- --check
```

รอบเตรียมเครื่องมือตรวจ syntax, key selection test และ config check แล้ว ยังไม่ได้รันเปลี่ยนรหัสจริงแทนผู้ใช้
ไม่ใช่ระบบ Forgot password สำหรับผู้ใช้งานทั่วไป ระบบนั้นต้องเพิ่ม recovery UI และบริการส่งเมลในงานแยก
