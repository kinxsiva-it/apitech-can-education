# Members API และการยืนยันตัวตน

สถานะ: มี NestJS API และ apply migrations แล้วเมื่อ 13 พฤศจิกายน 2026 ยังไม่ทดสอบ signup/approval end-to-end กับ hosted Supabase
ดู [บันทึก deployment](SUPABASE_DEPLOYMENT_2026-11-13.md) สำหรับผลตรวจ grants/RLS และ anonymous HTTP

## ขั้นตอนแต่ละคำขอ

1. Frontend Login ผ่าน Supabase Auth SDK แล้วส่ง `Authorization: Bearer <access_token>` ไป API
2. Global AuthGuard เรียก `supabase.auth.getUser(token)` ให้ Auth server ตรวจ token ไม่ decode JWT หรือเชื่อ metadata เอง
3. เรียก `get_my_access` ด้วย JWT เดิมเพื่ออ่าน role/status/email confirmation ล่าสุดจากฐานข้อมูล
4. เส้นทาง Admin ตรวจ role=admin และ can_access_education=true ไม่ cache บทบาทจาก token เดิม
5. Service ส่ง JWT ผู้เรียกต่อไปยัง PostgREST/RPC เพื่อคง RLS และการตรวจสิทธิ์ในฐานข้อมูลซ้ำ

แต่ละคำขอมี client ของตัวเอง ไม่มี shared session และไม่มี service-role key
Response ใช้ Cache-Control: no-store ไม่ส่ง token หรือ Supabase client กลับ Frontend
Public มีเฉพาะ health และรายชื่อสถาบันสำหรับสมัคร ส่วน route ใหม่อื่นต้องมี token โดย default
ใช้ `@RequireApproved()` กับ API สื่อการสอนที่จะเพิ่มภายหลัง ส่วน routes ของสมาชิกเองอนุญาต pending/rejected/suspended เพื่อดูสถานะและส่งใหม่ตามกฎ SQL
Guard นี้ยังไม่ได้ป้องกันหน้า React Education หรือ public GLB ซึ่งเป็นงาน frontend/storage ในระยะถัดไป

## Endpoints

| Method / URL | สิทธิ์ | หน้าที่ |
|---|---|---|
| GET `/api/health` | Public | API ตอบได้ ไม่ใช่ DB readiness |
| GET `/api/institutions?search=&limit=20` | Public | เฉพาะ id/name ของสถาบัน active ผ่าน anonymous RLS |
| GET `/api/members/me` | Signed-in | สิทธิ์และคำขอล่าสุดของตัวเอง |
| GET `/api/members/me/profile` | Signed-in | Profile ตัวเอง |
| PATCH `/api/members/me/profile` | Signed-in | แก้ชื่อ/สถาบัน SQL ป้องกันแก้ขณะพิจารณา |
| GET `/api/members/me/requests?limit=20&offset=0` | Signed-in | ประวัติคำขอตัวเอง ไม่อ่านของคนอื่นแม้ผู้เรียกเป็น Admin |
| POST `/api/members/me/requests` | Signed-in | ส่งรอบแรกหรือหลัง rejected; idempotent เมื่อมี pending เดิม |
| GET `/api/admin/members?status=pending&search=&limit=20&offset=0` | Active Admin | รายการสมาชิกพร้อม snapshot ของคำขอล่าสุด |
| PATCH `/api/admin/membership-requests/:requestId` | Active Admin | อนุมัติ/ปฏิเสธพร้อม optimistic version |
| PATCH `/api/admin/members/:userId/status` | Active Admin | ระงับ/คืนสิทธิ์ instructor |

ไม่รับ actorId/role/userId เพิ่มใน body เพื่อเปลี่ยนเจ้าของการทำรายการ
ไม่มี endpoint เปลี่ยน role หรือสร้าง Admin เพิ่ม
Notification read/สถาบัน CRUD/audit browser UI ยังไม่เชื่อม HTTP endpoints ในรอบนี้ แม้มี SQL รองรับบางส่วนแล้ว

## Request ตัวอย่าง

PATCH profile:

```json
{
  "fullName": "อาจารย์ ตัวอย่าง",
  "institutionId": null,
  "institutionOther": "หน่วยงานอื่น",
  "expectedRevision": 1
}
```

POST requests:

```json
{ "expectedRevision": 2 }
```

PATCH review:

```json
{ "decision": "rejected", "reason": "กรุณาแก้ไขชื่อ", "expectedVersion": 1 }
```

PATCH status:

```json
{ "action": "suspend", "reason": "รอตรวจสอบข้อมูล", "expectedVersion": 3 }
```

Input ใช้ camelCase ส่วนผลลัพธ์ใช้ snake_case ตาม contracts/RPC
expectedRevision มาจาก profile ส่วน expectedVersion มาจาก request/access ตามประเภทงาน อย่าใช้เวอร์ชันสลับกัน
ฟิลด์ที่ไม่กำหนด, UUID ผิด, pagination เกินเพดาน และเหตุผลปฏิเสธ/ระงับที่ว่างถูกปฏิเสธ
List สมาชิก/history limit สูงสุด 100, offset สูงสุด 100000; dropdown สถาบัน limit สูงสุด 50
Admin status=pending แสดงเฉพาะผู้ที่ยืนยันอีเมลและมีคำขอ pending ไม่ปนบัญชียังไม่ยืนยัน

## HTTP errors

| Status | ความหมาย |
|---|---|
| 400 | Input, เหตุผล หรือ transition ไม่ถูกต้อง |
| 401 | ไม่มี/ผิดรูปแบบ/หมดอายุ/ไม่ผ่านการตรวจ access token |
| 403 | ตัวตนถูกต้องแต่สิทธิ์ไม่พอ |
| 409 | Version เก่า, ข้อมูลซ้ำ หรือสถานะขัดกัน ให้โหลดใหม่ |
| 503 | Config ไม่ครบ, Auth/DB ติดต่อไม่ได้, migrations ยังไม่มี หรือข้อมูลสิทธิ์หาย/ผิดรูปแบบ |

ไม่ส่ง SQL error messages, schema details หรือ secret ของ upstream กลับ client
เมื่อ migration ยังไม่ apply ให้ถือว่า member endpoints ยังใช้กับ Project จริงไม่ได้ ไม่ fallback เป็น approved

## Environment

ใช้ apps/api/.env.local: SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY (ไม่มี VITE_)
รอบนี้เตรียมจาก public configuration ของ Education ให้แล้วในไฟล์ local ที่ ignore โดยไม่เพิ่ม secret
ใช้ publishable key เท่านั้น ห้าม service-role/secret key ใน gateway นี้
หากไม่ตั้งทั้งสองค่า health ยังทำงาน ส่วน member endpoints ตอบ 503
หากตั้งบางค่า/รูปแบบผิด/ใช้ secret key จะไม่ผ่าน startup validation
อนุญาต HTTPS origin หรือ HTTP loopback สำหรับ Supabase local
เริ่มใหม่ด้วย npm run dev:api หรือ npm run dev:all หลังแก้ env

## Migration และการทดสอบ

- Migration 1: schema/grants/RLS/audit
- Migration 2: signup/profile/review/state/notification routines
- Migration 3: list_members_for_admin อ่าน email จาก Auth เฉพาะเมื่อผ่าน Admin พร้อม filters/pagination
- ไม่ expose auth.users และไม่ grant SELECT ตาราง Auth ให้ authenticated/Admin
- RPC ที่คืน composite row ใช้ .single() ของ PostgREST; RPC ที่คืน JSON/UUID ใช้ผลลัพธ์ scalar

```powershell
npm run test:api
npm run test:db
npm run build
npm run lint
```

API tests มี 10 กรณีผ่าน HTTP listener จริง ใช้ supabase-js จริง แต่จำลอง Auth/PostgREST upstream เพื่อทดสอบ guard, JWT forwarding, validation, privacy และ error mapping
SQL tests มี 9 กรณี ใช้ migrations จริงบน PostgreSQL/PGlite โดยจำลอง auth schema และ JWT subject
ยังไม่ยืนยันลายเซ็น JWT/refresh/revocation กับ Supabase Auth จริง หรือหลาย Admin review พร้อมกันหลาย connection
ยังไม่มี email worker หรือหน้าจอสมาชิก ชุดทดสอบนี้ไม่ใช่การรับรองว่า production พร้อมใช้งาน

อ้างอิง: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [NestJS guards](https://docs.nestjs.com/guards)
