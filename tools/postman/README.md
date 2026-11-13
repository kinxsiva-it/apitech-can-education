# ทดสอบด้วย Postman

ใช้ Postman Desktop สำหรับ API ที่ localhost โดยไม่ต้องกรอกรหัสผ่านใน Terminal
ไฟล์นี้เป็นเครื่องมือทดสอบ ไม่ได้เพิ่มเส้นทาง Login ใหม่ใน NestJS: Login เรียก Supabase Auth แล้วใช้ token ไป Members API

## ไฟล์ที่ใช้

| ไฟล์ | หน้าที่ |
|---|---|
| `APITech.postman_collection.json` | คำขอและ scripts พร้อม Import |
| `APITech.local.postman_environment.json` | ค่าของเครื่องนี้ เตรียม project URL/publishable key ให้แล้ว ถูก ignore |
| `APITech.postman_environment.example.json` | ตัวอย่างปลอด credentials สำหรับ repo/เครื่องใหม่ |
| `generate.mjs` | สร้าง Collection/example; ใช้ --local เพื่อสร้าง local environment ถ้ายังไม่มี |

ไฟล์ local ถูกสร้างไว้แล้วในเครื่องนี้ ไม่มีรหัสผ่าน อีเมล หรือ tokens เตรียมไว้
เมื่อ clone ใหม่ ใช้ `npm run postman:generate` หลังเตรียม `apps/api/.env.local`
ตัว generate ไม่ทับ local environment ที่มีอยู่ เพื่อรักษาค่าที่คุณกรอกไว้
หากเปลี่ยน Project/key ให้แก้ environment ใน Postman ตามค่าใหม่

## 1. เปิด Backend

ที่ root ของ repo รันคำสั่งนี้ครั้งเดียวและเปิด Terminal ค้างไว้:

```powershell
npm run dev:api
```

ใช้ dev:all แทนได้หากต้องการเปิดหน้าเว็บด้วย อย่ารัน API สองชุดชนพอร์ต 3000

## 2. Import

1. เปิด Postman Desktop → Import
2. เลือก `tools/postman/APITech.postman_collection.json`
3. Import `tools/postman/APITech.local.postman_environment.json` ด้วย
4. เลือก Environment ชื่อ **APITech Local** เป็น environment ที่ใช้งาน
5. เปิด Environments/Variables ของ environment นี้ แล้วกรอกค่า:

| Variable | ค่า |
|---|---|
| `member_email` | อีเมลที่สมัครบัญชีทดสอบแล้ว |
| `member_password` | รหัสผ่านที่ตั้งตอน signup ของแอปนี้ |
| `full_name` | ชื่อสำหรับการสมัครใหม่/แก้ profile ไม่ใช่อีเมล |

api_base_url ตั้งเป็น http://127.0.0.1:3000/api ส่วน supabase_url/publishable_key เตรียมไว้ใน local environment แล้ว
ปล่อย member_access_token, refresh_token และ version ต่าง ๆ ว่างไว้ Scripts จะเติมเมื่อได้ผลตอบกลับ
รหัสผ่าน/tokens ตั้ง type secret เพื่อซ่อนค่า แต่การซ่อนค่าไม่ใช่การรับประกันว่า Postman ไม่ sync/export ค่านั้น
เก็บข้อมูลทดสอบไว้ในพื้นที่ส่วนตัว ไม่แชร์ environment หรือ response Login ที่มี tokens และไม่ Commit environment ที่กรอกจริง
ใช้เฉพาะ publishable key ใน Postman ไม่ใช้ secret/service_role key

## 3. บัญชีที่ยืนยันอีเมลแล้ว: กด Send ตามลำดับ

1. **00 — Public checks → Health — START HERE**: ควรได้ 200 และ status=ok
2. **01 — Member authentication → Login member — use your existing confirmed account**: กด Send ควรได้ 200
3. หลัง Login สำเร็จ Post-response script เก็บ member_access_token/refresh_token ให้อัตโนมัติ
4. **02 — My membership → My status — run after Login**: กด Send
5. ตามด้วย **My profile** และ **My request history** เพื่อดูข้อมูล/คำขอ

ผลที่คาดสำหรับบัญชีทดสอบปัจจุบัน: role=instructor, status=pending, email_confirmed=true และ can_access_education=false
ไม่ต้องกด Signup หรือเปิดลิงก์ยืนยันอีเมลเก่าซ้ำ
แถบ Body ของ response Login มี token จริง ไม่ต้องคัดลอกหรือส่งมาในแชต

ถ้า Login ยังตอบ invalid_credentials แปลว่า Supabase ไม่รับรหัสผ่าน/อีเมลนั้น การเปลี่ยนจาก CLI เป็น Postman ไม่ได้เปลี่ยนหรือรีเซ็ตรหัสผ่าน
ใช้รหัสผ่านตอน signup ของแอป ไม่ใช่รหัสผ่านบัญชี Supabase Dashboard ตรวจภาษาแป้นพิมพ์/Caps Lock
กรณีจำไม่ได้ต้องทำ password recovery แยก ซึ่ง Collection นี้ยังไม่เพิ่ม recovery flow เพราะหน้า reset password ยังไม่ได้ทำ

## 4. ข้อมูลใหม่/แก้ไขข้อมูลของตัวเอง

- Signup เป็นตัวเลือกสำหรับบัญชีใหม่เท่านั้น และจะส่งอีเมลจริงเมื่อกด Send
- ต้องตั้ง Confirm email/SMTP และ localhost redirect ตาม [คู่มืออีเมล](../../docs/AUTH_TESTING_GUIDE.md)
- Update profile ต้องเรียก My profile ก่อนเพื่อรับ revision และแก้ full_name ใน environment
- ถ้าคำขออยู่ pending การแก้ profile จะได้ 409 ตามกฎ freeze ระหว่างพิจารณา
- Submit/resubmit ใช้หลังกรอกข้อมูลที่ขาดหรือหลัง rejected ไม่จำเป็นต้องกดซ้ำสำหรับคำขอ pending ที่มีอยู่แล้ว
- Refresh member session ใช้เมื่อ access token หมดอายุ จะเก็บทั้ง access/refresh token ชุดใหม่ให้

## 5. Admin (ทำภายหลัง Dev เตรียมบัญชี)

ตอนนี้ยังไม่มีการสร้าง Admin ให้โดย Collection นี้ และบัญชีอาจารย์ไม่กลายเป็น Admin อัตโนมัติ
รหัสผ่าน Admin ใน Postman เป็นของ application user ที่ Dev กำหนดสิทธิ์ ไม่ใช่ Supabase Dashboard admin credential

1. ใส่ admin_email/admin_password ใน environment แล้วกด Login Admin ในหมวด 03
2. กด My Admin identity ต้องได้ role=admin และ can_access_education=true
3. target_user_id ถูกตั้งเป็นบัญชีอาจารย์ที่ Login ในหมวด 01 หากต้องการทดสอบคนอื่นให้กำหนด UUID เป้าหมายเอง
4. กด Pending queue ในหมวด 04 เพื่อเติม target_request_id/version ของเป้าหมายนั้น
5. เลือก Approve หรือ Reject เพียงทางเดียว; Reject ต้องกรอก rejection_reason
6. หลังพิจารณา ให้กด All members เพื่อโหลด target_access_version ใหม่ก่อน Suspend/Restore
7. Suspend ต้องกรอก suspension_reason และเป้าหมายต้อง approved; Restore ใช้เมื่อ suspended
8. กลับไปกด My status ของอาจารย์เพื่อตรวจสิทธิ์ล่าสุดโดยใช้ token เดิม

Collection ไม่เลือกสมาชิกแถวแรกให้เอง หากเป้าหมายไม่อยู่ในหน้า list จะไม่เตรียม version สำหรับ mutation
List ครั้งนี้ limit=100 หากมีมากกว่า 100 คนต้องปรับ offset/search ให้พบเป้าหมาย
Request ที่ข้อมูล/token/version ไม่ครบใช้ pm.execution.skipRequest เพื่อข้ามการส่ง พร้อมแจ้งชื่อ variable ที่ขาด

**ใช้ Send ทีละรายการ ไม่ใช้ Run ทั้ง Collection** เพราะ Approve/Reject/Suspend/Restore เปลี่ยนข้อมูล hosted Project จริง
การอนุมัติจะเข้าคิวอีเมล แต่ยังไม่มี worker ส่งอีเมลแจ้งผลจริง

## 6. อ่านข้อผิดพลาด

| ผล | วิธีตรวจ |
|---|---|
| Could not get response | API เปิดอยู่หรือไม่, api_base_url ถูกหรือไม่, ใช้ Desktop/agent ที่เข้าถึง localhost ได้หรือไม่ |
| invalid_credentials จาก Login | ตรวจอีเมล/รหัสผ่านบัญชีแอป เป็นข้อผิดพลาดจาก Auth ก่อนเรียก NestJS |
| email_not_confirmed | ต้องยืนยันอีเมลก่อน |
| 401 จาก Members API | เลือก environment ถูกหรือไม่, Login สำเร็จหรือยัง, token หมดอายุหรือไม่ |
| 403 | สิทธิ์ไม่พอ เช่น instructor เรียก Admin API |
| 409 | Version หรือสถานะเปลี่ยน ให้โหลด My profile/All members ใหม่ตามประเภทงาน |
| 503 | ตรวจ API env/การเชื่อม Supabase/ข้อมูลสิทธิ์ |

สคริปต์ของ Collection ตรวจผ่านด้วย `npm run test:postman` 5 กรณี ครอบคลุมการเก็บ/ล้าง tokens, escape password, ไม่เลือกผู้ใช้ผิดคน และแยก request/access versions
ยังไม่ได้ทดสอบ Import/Send ผ่าน Postman Desktop จริงในรอบนี้ และไม่ได้ส่งเมลหรือเปลี่ยนสถานะบัญชีระหว่างสร้าง Collection

อ้างอิง: [Import](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/), [Environment variables](https://learning.postman.com/docs/use/send-requests/variables/environment-variables/)
