# ผล Apply CMS Migrations — 14 พฤศจิกายน 2026

Project: `apitech-can-education` (`zkhrylfgslbcgcwhdmpt`) · CLI target: production
Branch โค้ด: `features/admin-cms`

เจ้าของอนุญาตให้ apply migration สองไฟล์หลัง CLI ขอ production consent แล้ว
ตรวจ dry-run ก่อน apply พบเฉพาะรายการที่เตรียมไว้:

1. `20261113000200_cms_content.sql` — schema/RPC/RLS, draft/published versions, audit และ private image bucket
2. `20261113000300_email_worker.sql` — outbox claim/lease/ack และสิทธิ์ worker

คำสั่ง `supabase db push --linked --yes` ผ่าน และ dry-run หลัง apply รายงาน `upToDate: true`, `migrations: []`
ไม่ได้ seed บทเรียนทดลอง อนุมัติ/แก้บัญชีผู้ใช้ หรือรัน email worker ระหว่าง deployment

## ผลตรวจบนฐานข้อมูลจริง

รันผ่าน CLI `db query --remote --read-only`:

| ชุดตรวจ | ผล |
|---|---|
| `supabase/checks/verify-cms.sql` | 7/7 ผ่าน |
| `supabase/checks/verify-member-access.sql` | 11/11 ผ่าน |

CMS checks ยืนยัน migration history, RLS ของสามตาราง CMS, ไม่มีสิทธิ์เขียนตารางตรงของ API roles,
bucket `cms-images` เป็น private, มี Storage policies ทั้งสอง, worker RPC เรียกได้เฉพาะ service role
และ CMS RPC จำกัด authenticated พร้อม fixed search path

Member checks เดิมผ่านครบ: RLS/grants, Auth triggers, audit triggers, RPC permissions,
การปิดสิทธิ์อ่าน Auth users/outbox โดยตรง และ anonymous institution columns

ผลนี้เป็นการตรวจ catalog/permissions ไม่ใช่การทดลองใช้งานด้วย JWT จริงหรือทดสอบอัปโหลดไฟล์

## ตรวจรับต่อ

1. เปิด Admin `http://localhost:5174` และ Education `http://localhost:5173` พร้อม API
2. Login Admin แล้วอนุมัติผู้สมัครที่รออยู่ จากนั้นตรวจผู้สมัครเข้าเรียนได้
3. สร้างร่างทดสอบและอัปโหลดรูป ตรวจ Preview → Publish → Education → Restore
4. ทดสอบผู้ยังไม่ผ่านอนุมัติอ่านเนื้อหาไม่ได้ และรูปในร่างไม่แสดงให้อาจารย์
5. ตั้ง provider/sender/scheduler ของ email worker แล้วทดลองส่งอีเมลด้วยบัญชีที่เจ้าของควบคุม

ดูขั้นตอนและข้อจำกัดใน [ADMIN_CMS.md](ADMIN_CMS.md)
รอบนี้ไม่ได้ commit/push โค้ดหรือ deploy frontend/backend ขึ้น public hosting
