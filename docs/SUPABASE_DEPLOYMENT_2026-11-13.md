# บันทึก Apply migrations — 13 พฤศจิกายน 2026

## เป้าหมายและขอบเขต

- Project: `apitech-can-education` / ref `zkhrylfgslbcgcwhdmpt`
- Region: ap-northeast-1; PostgreSQL 17
- Source commit: `f7df839` บน `features/member-access-foundation`
- ใช้ Supabase CLI 3.1.0 ที่ Login ด้วยบัญชีเจ้าของโปรเจกต์แล้ว ไม่ได้ใช้ publishable key ทำ DDL
- CLI เรียก main environment ว่า production; นี่คือ Project ใหม่ที่ผู้ใช้ระบุ ไม่ได้สร้าง preview branch แยก
- ตรวจพบ Auth users 0 ราย และไม่มี application tables/private functions/Auth triggers ของระบบนี้ก่อน apply
- ไม่สร้างผู้ใช้ สถาบัน บัญชี Admin หรือ seed ใด ๆ และไม่เปลี่ยน Auth/SMTP settings ในรอบนี้

## Migration history ที่ตรวจแล้ว

| Version | Name | ผล |
|---|---|---|
| 20261111000100 | member_schema | Applied |
| 20261111000200 | member_workflows | Applied |
| 20261113000100 | admin_member_listing | Applied |

ทำ dry-run ก่อน apply พบเฉพาะ 3 ไฟล์นี้ ไม่มี seed/roles
apply ด้วย db push โดยใช้ --skip-vault จึงไม่อัปเดต Vault secrets
ตรวจ dry-run หลัง apply ได้ `upToDate=true` และไม่มี migration ค้าง
ไม่แก้ไฟล์ migration ที่ apply ไปแล้ว หากต้องเปลี่ยน schema ให้เพิ่ม version ใหม่

## ตรวจ catalog แบบ read-only: ผ่าน 11 ข้อ

ใช้ `supabase/checks/verify-member-access.sql` บน Project จริง:

1. Migration history ครบ 3 รายการ
2. RLS เปิดครบ 8 ตาราง รวม private.email_outbox
3. anon/authenticated ไม่มี direct INSERT/UPDATE/DELETE หรือ column write privileges
4. Public RPC ทั้ง 8 เปิด EXECUTE เฉพาะ authenticated ไม่เปิดให้ anon
5. Public RPC ใช้ SECURITY DEFINER และ search_path ว่างตามแบบ
6. Internal functions เรียกตรงด้วย anon/authenticated ไม่ได้ ยกเว้น boolean access helpers ที่ policy ต้องใช้
7. Auth triggers ครบและเปิดใช้ 3 ตัว
8. Audit triggers ครบและเปิดใช้ 5 ตัว
9. Email outbox ไม่เปิด SELECT ให้ anon/authenticated
10. auth.users ไม่เปิด SELECT ให้ anon/authenticated
11. anon อ่านสถาบันได้เฉพาะคอลัมน์ id/name ไม่ได้อ่าน is_active

นี่เป็นการตรวจ schema/grants/triggers ไม่ใช่การทดสอบ trigger ทำงานผ่านการสมัครจริง

## ตรวจ hosted HTTP แบบไม่สร้างข้อมูล

เรียก Project ด้วย publishable key ใน env ของเครื่อง โดยไม่พิมพ์ key ลง log:

| ตรวจ | ผล |
|---|---|
| GET สถาบัน id/name แบบ anonymous | 200, array |
| GET profiles แบบ anonymous | 401 |
| GET audit_logs แบบ anonymous | 401 |
| เรียก get_my_access แบบ anonymous | 401 |
| ขอ private schema ด้วย Accept-Profile | 406 / PGRST106 ยืนยันว่า private ไม่อยู่ใน exposed schemas |
| อ่าน Auth settings | 200 |

Auth settings ที่ตรวจได้: Email provider เปิด, Signup ไม่ถูกปิด, mailer_autoconfirm=false
จึงมีข้อกำหนดยืนยันอีเมลอยู่แล้ว ไม่ได้เปลี่ยนค่า Dashboard
ยังไม่ได้ตรวจการส่งอีเมลถึงปลายทางหรือ SMTP domain จริง

## Security Advisor

ตรวจประเภท security ระดับ warn ขึ้นไป พบเพียง `authenticated_security_definer_function_executable` จำนวน 8 warnings ไม่มี ERROR ในผลตรวจนี้

ครอบคลุม get_my_access, update_my_profile, submit_membership_request, review_membership_request,
change_member_status, save_institution, mark_notification_read และ list_members_for_admin

เป็นการเตือนพื้นผิว API ที่ออกแบบให้ signed-in user เรียก SECURITY DEFINER RPC ได้ ไม่ใช่หลักฐานว่าข้ามสิทธิ์ได้แล้ว
ต้องคงการตรวจ auth.uid(), Admin role/status, ownership, version/transition ภายใน SQL แต่ละฟังก์ชัน
การตรวจเฉพาะ NestJS ไม่เพียงพอเพราะผู้มี JWT สามารถเรียก RPC ตรงได้
ยังต้องทดสอบ signed-in integration และ concurrency จริงก่อนรับรองใช้งาน production ไม่ปิด warnings โดยเปลี่ยน EXECUTE แบบไม่ตรวจผลกระทบ

## คำสั่งตรวจซ้ำ (read-only)

```powershell
npx --yes --package=supabase@3.1.0 supabase db query --remote=zkhrylfgslbcgcwhdmpt --read-only --file supabase/checks/verify-member-access.sql
npx --yes --package=supabase@3.1.0 supabase db push --remote=zkhrylfgslbcgcwhdmpt --dry-run --skip-vault
npx --yes --package=supabase@3.1.0 supabase db advisors --remote=zkhrylfgslbcgcwhdmpt --type security --level warn
```

CLI connection/cache state ใน supabase/.temp และ .branches ถูก ignore ไม่ Commit
ไม่มี access token, database password หรือ secret ในเอกสารนี้

## งานถัดไป

- เตรียมบัญชีทดสอบและวิธีจัดการบัญชี Admin โดย Dev ก่อนสร้างข้อมูลจริง
- ทดสอบ signup → ยืนยันอีเมล → pending → Admin อนุมัติ/ปฏิเสธ → สิทธิ์เปลี่ยน กับ Auth/PostgREST จริง
- ทดสอบ old JWT หลังระงับ และสอง Admin พิจารณาคำขอเดียวกันพร้อมกัน
- ต่อหน้า Login/Register/สถานะและ CMS อนุมัติสมาชิก
- เพิ่ม email worker/ผู้ให้บริการอีเมลแจ้งผล; ขณะนี้มีแค่ outbox ไม่มี worker ส่งจริง

Demo Education และ GLB ยังเป็น public เพราะยังไม่ได้เพิ่ม route guards ฝั่ง Frontend/ย้าย protected assets
