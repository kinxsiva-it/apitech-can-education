# ฐานข้อมูล Supabase

โฟลเดอร์นี้เป็นเจ้าของ schema, grants, RLS และ RPC ผ่าน migrations
เตรียม migration ระบบสมาชิกใน repo แล้ว แต่ยังไม่ได้ apply บน Supabase จริง

## Migration ที่เตรียมไว้

| ไฟล์ | หน้าที่ |
|---|---|
| `migrations/20261111000100_member_schema.sql` | 8 ตาราง, constraints/indexes, grants/RLS, access helpers และ audit triggers |
| `migrations/20261111000200_member_workflows.sql` | Auth triggers, profile/submit/review/suspend/restore RPC, สถาบัน และ mark-read |
| `migrations/20261113000100_admin_member_listing.sql` | Admin member list พร้อม Auth email, snapshot และ bounded pagination |

RPC public รับเฉพาะข้อมูลที่จำเป็น actor มาจาก auth.uid() ไม่ใช่ browser payload
Admin ไม่สามารถเปลี่ยน role หรือเพิ่ม Admin ผ่าน RPC เหล่านี้
การอนุมัติ/ปฏิเสธเปลี่ยนสถานะ บันทึก event/audit และเข้าคิวอีเมลใน transaction เดียว
Email outbox ยังไม่มี worker/สิทธิ์ worker และยังไม่ส่งอีเมลจริง

## ทดสอบในเครื่อง

```powershell
npm install
npm run test:db
```

ใช้ PGlite ซึ่งเป็น PostgreSQL แบบ WASM ใน memory ไม่ต้องใช้ Docker และไม่อ่าน .env หรือเชื่อม hosted project
tests สร้าง auth.users/auth.uid() และ roles แบบจำลองเฉพาะส่วนที่ใช้ แล้วรัน SQL migrations จริง
ตรวจทั้ง anon/authenticated/Admin ภายใต้ grants/RLS ไม่ได้ใช้ owner ทดสอบสิทธิ์ของผู้ใช้
ใช้ owner เฉพาะสร้าง fixture, จำลอง Auth/Dev และตรวจผลภายใน

ชุดทดสอบ 9 กลุ่ม: signup/confirmation idempotency, RLS/privilege escalation, approval/suspension,
rejection/resubmit/snapshot, institutions/notification isolation, malformed registration metadata,
transaction rollback เมื่อเข้าคิวอีเมลล้มเหลว, already-confirmed Auth insert/metadata tampering และ Admin listing/email privacy/filters
PGlite ไม่ใช่ Supabase Auth/PostgREST จริง และชุดนี้ยังไม่ทดสอบ multi-connection concurrency หรือ worker retry
ก่อน apply จริงต้องทดสอบ Auth callbacks/PostgREST/JWT และคำขอพร้อมกันบน Supabase local/staging ด้วย

## Auth และ Admin ก่อนใช้งานจริง

- ต้องเปิด email confirmation ใน Supabase Auth; migrations ไม่ได้ตั้งค่า Dashboard แทนผู้ดูแล
- การสมัครสร้าง instructor/pending เสมอ ไม่เชื่อ role/status/email_verified ที่อยู่ใน metadata
- เมื่อ email_confirmed_at เปลี่ยน null → มีค่า และ profile ครบ จึงสร้างคำขอ/แจ้งเตือนให้ Admin
- ผู้ที่ยืนยันแล้วแต่ข้อมูลไม่ครบให้กรอก profile แล้ว submit ผ่าน API ในระยะถัดไป
- Auth users ที่มีอยู่ก่อน migration จะได้ profile/access defaults แต่ยังไม่ auto-submit; ใช้ submit fallback หลัง login
- Bootstrap Admin ให้ Dev ทำผ่านช่องทางที่เชื่อถือได้ ไม่เพิ่มบัญชีหรือรหัสผ่านจริงลง migration/seed
- ลำดับที่รองรับ: สร้างบัญชียังไม่ยืนยันอีเมล → Dev กำหนด role=admin/status=approved → ผู้ใช้ยืนยันอีเมล
- สิทธิ์ Admin จะมีผลเมื่อยืนยันอีเมลแล้ว และการเปลี่ยน role จะมี audit trigger
- ไม่ควร promote บัญชีที่มี pending instructor request โดยตรง เพราะจะเหลือคำขอค้าง ต้องออกแบบ/ตรวจขั้นตอนยกเลิกคำขอก่อนหากต้องรองรับกรณีนี้
- ยังไม่มี endpoint provision Admin และไม่มี secret สำหรับ Dev ถูกเพิ่มใน repo

## ก่อน apply บน Supabase

1. Review migrations กับ schema ของ Project และผลการทดสอบ staging
2. ตรวจว่า private ไม่อยู่ใน exposed schemas และ auth trigger ชื่อเดียวกันยังไม่มี
3. ตั้ง Auth redirects/SMTP และเตรียมขั้นตอน Dev bootstrap Admin
4. Apply migration ตามลำดับผ่านกระบวนการที่อนุญาตในงาน deploy แยก ไม่รันจาก tests นี้
5. ตรวจ grants/RLS, Auth signup/confirmation, การเข้าถึงผ่าน API และสอง Admin review พร้อมกัน

มี NestJS auth/members API และ HTTP tests แล้ว แต่ยังไม่มี UI สมาชิกหรือการ apply จริง การมี SQL/API code ยังไม่ทำให้ Demo ถูกจำกัดสิทธิ์
ดู [Members API](../docs/MEMBERS_API.md) ก่อนเชื่อม frontend หรือทดสอบ hosted Supabase

- NestJS API อยู่ `apps/api/`; ไม่เขียน schema แยกซ้ำด้วย ORM auto-sync
- เพิ่ม/แก้ schema ด้วย migration ใหม่แบบมี version หลังไฟล์นั้นถูก apply แล้ว ไม่แก้ประวัติที่ใช้จริงไปแล้ว
- เพิ่มชุดทดสอบสิทธิ์ anon/authenticated/Admin ควบคู่กับ migration
- ห้ามใช้ service role เพียงอย่างเดียวในการทดสอบ RLS
- ไม่เก็บรหัสผ่านฐานข้อมูล access token หรือ secret ในโฟลเดอร์นี้
- seed ใช้ข้อมูลตัวอย่าง ไม่ใส่บัญชี Admin จริงหรือ credentials

แบบระบบ: [Member access design](../docs/MEMBER_ACCESS_DESIGN.md)
