# Admin CMS — คู่มือใช้งานและตรวจรับ

13 พฤศจิกายน 2026 · branch `features/admin-cms` ต่อจาก `features/member-auth-ui` (`87d373e`)
ยังไม่ merge/push; วันที่ 14 พฤศจิกายน 2026 apply migration CMS ลง hosted project แล้วหลังเจ้าของอนุญาต ตรวจ catalog/security ผ่าน 18 รายการ ดู [ผล deployment](SUPABASE_CMS_DEPLOYMENT_2026-11-14.md)

## เปิดใช้งาน

```powershell
npm install
npm run dev:all
```

- Admin: http://localhost:5174
- Education: http://localhost:5173
- API: http://127.0.0.1:3000/api/health

Admin ใช้ Supabase URL/publishable key ใน `apps/admin-web/.env.local` ตาม `.env.example`
เตรียมค่าที่ปลอดภัยสำหรับ browser จาก project เดียวกับ Education ไว้ในเครื่องนี้แล้ว ไฟล์จริงถูก ignore
ถ้า Vite เปิดค้างอยู่ก่อนเพิ่ม env ให้ restart Admin; API ต้อง restart ถ้า process เดิมไม่ได้เปิด watch
Admin ใช้ storage key แยกจาก Education จึง login คนละบัญชีบนสองเว็บได้
แพ็กเกจ source ร่วม (`@apitech/brand`, `@apitech/content-ui`) ถูกยกเว้นจาก dependency pre-bundling และ dedupe React เพื่อไม่ให้ dev server ที่เปิดค้างติด cache ตอนเพิ่ม workspace package
ใช้บัญชี Admin ที่ Dev เตรียมไว้ ไม่มี signup หรือเมนูเพิ่มสิทธิ์ Admin ใน CMS

สมาชิก/สถาบัน/การแจ้งเตือน/ประวัติเดิมใช้ migration สมาชิกที่ apply แล้ว
เนื้อหา รูปภาพ และสถานะอีเมลมี migration ใหม่สองไฟล์ใน hosted project แล้ว พร้อมทดสอบผ่าน CMS ส่วนการส่งอีเมลต้องตั้ง provider/worker เพิ่ม

## Migration ที่เตรียมพร้อม

| ไฟล์ | สิ่งที่เพิ่ม |
|---|---|
| `supabase/migrations/20261113000200_cms_content.sql` | Collections Education/Components, immutable snapshots ผ่านสิทธิ์ read-only, draft/published pointers, audit triggers, checked RPC และ private Storage bucket/policies |
| `supabase/migrations/20261113000300_email_worker.sql` | Lease/claim/ack สำหรับ outbox เดิม, สิทธิ์ worker เฉพาะ service role และสถานะอีเมลที่ Admin อ่านได้ |

ไม่มีการลบตาราง สมาชิก เนื้อหาเดิม หรือเปลี่ยนสิทธิ์บัญชีใด ไม่ seed เนื้อหาทดสอบลง production
Collection ว่างสองหมวดเป็น configuration เริ่มต้น; CMS bucket `cms-images` ต้องเป็น private
ตรวจ local PostgreSQL/RLS แล้วและ CLI dry-run พบเพียงสอง migration นี้
ก่อน apply CLI เคยตอบ `HostedMutationConsentRequiredError` เพราะ project ถูกระบุ production
เจ้าของยืนยันแล้วในวันที่ 14 พฤศจิกายน 2026 และรันคำสั่งนี้สำเร็จ ไม่ต้องรันซ้ำเพื่อเริ่มทดสอบ:

```powershell
npx --yes --package=supabase@3.1.0 supabase db push --linked --yes
```

ใช้ project ref `zkhrylfgslbcgcwhdmpt` ที่ link ไว้ ตรวจ target ทุกครั้งก่อนรัน
รัน [catalog checks](../supabase/checks/verify-cms.sql) และ member checks แล้วผ่านทั้งหมด ขั้นต่อไปทดสอบตามรายการด้านล่าง

## สมาชิกและสถาบัน

1. Login ด้วย Admin ที่ http://localhost:5174
2. เปิด **คำขอใช้งาน** (`/requests`) ค่าเริ่มต้นแสดงคำขอรออนุมัติ เลือกดูรายการปฏิเสธได้ แยกจากหน้า **สมาชิก** (`/members`) ที่เริ่มจากผู้ผ่านอนุมัติและใช้ระงับ/คืนสิทธิ์ ค้นหาชื่อ/อีเมลและกรองสถานะได้
3. เปิดรายละเอียด ตรวจอีเมล สถาบัน และข้อมูล ณ วันที่ส่งคำขอ เลือกอนุมัติ/ปฏิเสธ แล้วกดยืนยัน
4. ปฏิเสธและระงับต้องมีเหตุผล ระบบส่ง expected version ป้องกัน Admin สองคนเขียนทับกัน
5. บัญชี approved ระงับได้; บัญชี suspended คืนสิทธิ์ได้ การให้สิทธิ์ไม่มีผลกับบัญชี Admin ผ่านเมนูนี้
6. กลับ Education ด้วยบัญชีอาจารย์ กดตรวจสถานะล่าสุดแล้วต้องเข้าเรียนได้หลังอนุมัติ
7. ประวัติในหน้ารายละเอียดเก็บการพิจารณาทุกรอบ มี pagination
8. เพิ่ม/แก้สถาบัน หรือปิดใช้งาน แทนการลบเพื่อคงข้อมูลอ้างอิงเดิม ตรวจ Dropdown ที่หน้าสมัครด้วย

การแจ้งเตือนเป็นราย Admin ของคำขอที่เข้าคิวตาม schema เดิม อ่านแล้วแยกกันแต่ละคน
Badge refresh ทุก 30 วินาทีและหลังเปลี่ยนสถานะจาก CMS; ไม่ใช่ realtime push
เมื่อเปิดหน้าการแจ้งเตือน ระบบ mark read เฉพาะรายการที่โหลดมาแสดงในหน้านั้น เก็บประวัติไว้ หากมีหน้าถัดไปต้องเปิดดูหน้านั้นเพิ่มเพื่อ mark read ส่วนที่เหลือ
การ mark read ไม่ใช่การอนุมัติ เลขที่เมนู **คำขอใช้งาน** นับคำขอสถานะ pending ที่ยืนยันอีเมลแล้วจาก API และจะคงอยู่จนพิจารณา ไม่ขึ้นกับการอ่านแจ้งเตือน
หน้า **สมาชิก** เลือกดู approved/suspended ได้ และมีตัวเลือก **บัญชีทั้งหมด (รวมผู้สมัคร)** เพื่อค้นทะเบียนบัญชีทั้งหมด; บัญชียังไม่อนุมัติจะมีลิงก์ไปจัดการในหน้าคำขอแทน

## เนื้อหาและรูปภาพ

เปิด Education หรือ EV Component Lab ในเมนู Admin ทั้งสองหมวดใช้ workflow เดียวกัน:

1. เพิ่มรายการบทเรียน/ชิ้นส่วน แล้วกรอกชื่อและคำอธิบาย
2. เพิ่มหัวข้อภายใน เพิ่มบล็อกข้อความ หัวข้อย่อย หรือรูป
3. พิมพ์หรือวางข้อความล้วนได้ ไม่รับ HTML/JS/CSS เป็นโค้ด รูปแบบจำกัดรองรับ `**ตัวหนา**`, บรรทัด `- รายการ` และ `[ชื่อ](https://example.com)`
4. อัปโหลด JPEG/PNG/WebP ไม่เกิน 5 MB และใส่คำอธิบายภาพ บังคับ alt ก่อนบันทึก
5. ใช้ลูกศรขึ้น/ลงจัดลำดับรายการ หัวข้อ และบล็อก ลบได้โดยยืนยัน การลบมีผลต่อร่างเท่านั้นจนกว่าจะเผยแพร่
6. **บันทึกร่าง** ก่อน ปุ่มตัวอย่างจะเปิดได้เมื่อไม่มีการแก้ไขที่ยังไม่บันทึก
7. **ดูตัวอย่างก่อนเผยแพร่** ตรวจข้อความและรูป จากนั้น **ยืนยันเผยแพร่เวอร์ชันนี้**
8. เปิดหมวดเดียวกันบน Education และกดโหลดเนื้อหาล่าสุด จะอ่านเฉพาะ published snapshot
9. การแก้ร่างรอบถัดไปไม่เปลี่ยนฉบับที่แสดงจริง
10. ประวัติเวอร์ชัน → **นำกลับมาเป็นร่าง** สร้าง snapshot ใหม่จากเวอร์ชันเดิม แล้วดูตัวอย่าง/เผยแพร่ ไม่ลบประวัติ

Engineering limits เริ่มต้น: สูงสุด 100 รายการ/หมวด, 100 หัวข้อ/รายการ, 100 บล็อก/หัวข้อ, ชื่อ 200 ตัวอักษร, summary 2,000, text 20,000, alt 500 และเอกสารรวมไม่เกิน 1 MB
ตรวจค่าที่ API และ RPC ด้วย ไม่ใช่เพียง required ในฟอร์ม ขนาดรูป/limits เหล่านี้ปรับภายหลังได้เมื่อทราบเนื้อหาจริง
API ถอดรหัสรูปจริง จำกัด 25 megapixels และแปลงเป็น WebP ด้านยาวไม่เกิน 2,400 px พร้อมตัด metadata
GLB/HTML/SVG/PDF/วิดีโอไม่รับผ่าน upload นี้; ไม่แก้ไฟล์โมเดลเดิมจาก CMS

รูปเก็บ private bucket และ API ตรวจสถานะสมาชิกก่อนอ่านทุกครั้ง ไม่มี public URL หรือ signed URL อายุยาว
อาจารย์อ่านได้เฉพาะรูปที่อ้างอิงในฉบับเผยแพร่ปัจจุบัน Admin อ่านร่างได้
เบราว์เซอร์ที่ได้รับข้อมูลไปแล้วอาจเก็บในหน่วยความจำจน reload; การถอนสิทธิ์ห้ามการอ่านครั้งถัดไป ไม่สามารถถอนข้อมูลที่ดาวน์โหลดไปแล้วได้
รูปที่เคยอัปโหลดถูกเก็บไว้สำหรับประวัติ จึงไม่ลบ Storage object เมื่อเอาบล็อกรูปออก; Dev ต้องออกแบบ retention/orphan cleanup ก่อนปริมาณไฟล์มาก
หาก upload สำเร็จแต่ลงทะเบียน metadata ไม่สำเร็จ อาจมี orphan file ให้ Dev ตรวจ ไม่เปิดให้ Admin ลบ object ที่อาจอยู่ในเวอร์ชันเก่า

## อีเมลผลพิจารณา

**สถานะช่วงทดลอง 14 พฤศจิกายน 2026: พักระบบอีเมลแจ้งผลตามข้อตกลงเจ้าของ**
ใช้การประสานระหว่างผู้สมัครกับผู้ดูแลโดยตรง อนุมัติใน CMS แล้วผู้ใช้ตรวจสถานะบน Education
อีเมลยืนยันบัญชีและกู้รหัสผ่านยังคงทำงานผ่าน Supabase Auth
Worker จะจบโดยไม่ติดต่อ network/claim งาน เมื่อ `MEMBERSHIP_EMAIL_ENABLED` ไม่ใช่ `true` แม้มี provider credentials แล้ว
ไม่ต้องตั้ง provider/scheduler ตอนนี้ คงคิวและประวัติไว้ หน้าอีเมลใน CMS แจ้งสถานะพักไว้อย่างชัดเจน

ก่อนกลับมาเปิดส่งจริง: หยุด scheduler, ให้ Dev ตรวจคิวและเปลี่ยนงานช่วงทดลองเป็น skipped โดยเก็บประวัติไว้
ตรวจว่าไม่มี lease ค้าง ตั้งผู้ส่งและทดสอบกับอีเมลที่เจ้าของควบคุม แล้วจึงเปิด flag และ scheduler
การข้ามคิวเป็นงานดูแลฐานข้อมูลในอนาคต ไม่ได้ลบหรือเปลี่ยนคิวจริงในรอบบันทึกข้อตกลงนี้
เมื่อเปิดใช้งานภายหลังให้ปรับข้อความสถานะพักบนหน้า EmailPage ให้ตรงกันด้วย

Auth confirmation/reset ยังเป็นของ Supabase Auth ตามเดิม Worker ใหม่ส่งผลอนุมัติ/ปฏิเสธจาก outbox เดิม
ไม่ส่งอีเมลแจ้ง Admin และไม่ส่งเมลระงับ/คืนสิทธิ์เพิ่มเติมนอกข้อตกลง
หน้า **สถานะอีเมล** แสดง pending/sending/sent/failed/skipped, attempts และเวลาส่ง; sent หมายถึงผู้ให้บริการรับงาน ไม่ยืนยัน Inbox

เตรียม adapter Resend ไว้โดยยังไม่ได้สร้างบัญชีหรือส่งอีเมลจริง:

```text
# apps/api/.env.local หรือ server secrets เท่านั้น
MEMBERSHIP_EMAIL_ENABLED=true
SUPABASE_SECRET_KEY=<server secret key>
RESEND_API_KEY=<sending API key>
EMAIL_FROM=<verified sender address>
EDUCATION_SITE_URL=https://your-education-domain.example
```

ไม่คัดลอก secret ใส่ VITE_ หรือส่งในแชต ตั้งผู้ส่ง/โดเมนกับบริการก่อนใช้งาน
เลือก SMTP ของ Supabase Auth แยกได้ ไม่จำเป็นต้องเป็น provider เดียวกับ worker

```powershell
npm run worker:email -- --check
npm run worker:email
```

เมื่อเปิด flag แล้ว คำสั่งแรกตรวจ configuration โดยไม่ส่ง network request คำสั่งที่สองส่งจริงสูงสุด 10 งานต่อรอบ
Production ควรตั้ง scheduler รันทุกนาทีและติดตาม failed jobs
ใช้ lease 2 นาที, retry exponential สูงสุด 5 attempts, และ provider idempotency key ตาม outbox id
Resend เก็บ idempotency 24 ชั่วโมง ไม่ใช่การรับประกัน exactly-once ตลอดไป
ไม่รัน worker จริงระหว่างการพัฒนารอบนี้ เพราะยังไม่มีการตั้ง provider และคำสั่งจะส่งอีเมลจริง
ดู [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email) และ [Idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)

## โครงสร้างและ API

| ตำแหน่ง | งาน |
|---|---|
| `apps/admin-web/src/auth/` | Session และการตรวจ role/status กับ API |
| `apps/admin-web/src/app/` | Login, layout, navigation, dashboard และ routes |
| `apps/admin-web/src/features/members/` | สมาชิกและการพิจารณาคำขอ |
| `apps/admin-web/src/features/management/` | สถาบัน, notification, audit, email delivery |
| `apps/admin-web/src/features/content/` | Editor, Preview, version history |
| `apps/admin-web/src/shared/` | ฟอร์ม/Modal/Pagination/resource hooks |
| `apps/api/src/modules/admin/` | Institution, notification, audit, history และ delivery status API |
| `apps/api/src/modules/content/` | Draft, publish, restore, version list, upload และ protected media |
| `packages/contracts/` | Types ข้ามแอป |
| `packages/content-ui/` | Renderer ที่ใช้ร่วมกันใน Preview และ Education ไม่มี Auth หรือ secret |
| `apps/api/scripts/email-worker.mjs` | Worker ส่งอีเมลแบบหนึ่งรอบ |

API ใหม่ทั้งหมดอยู่ใต้ `/api`:

- Admin: `GET/POST /admin/institutions`, `GET /admin/notifications`, `PATCH /admin/notifications/:id/read`
- Admin: `GET /admin/audit`, `GET /admin/members/:id/history`, `GET /admin/email-deliveries`
- Admin: `GET /admin/content/:key`, `GET /admin/content/:key/versions`, `POST /admin/content/:key/draft|restore|publish`
- Admin upload: `POST /admin/media`, multipart field `file`
- สมาชิก approved: `GET /content/:key`, `GET /media/:id`
- `:key` คือ `education` หรือ `components`

เขียนข้อมูลสำคัญผ่าน RPC ด้วย JWT ของผู้ทำรายการ ไม่ใช้ service-role ข้าม RLS ใน request ปกติ
Worker ใช้ privileged key แยกใน process ฝั่ง server เท่านั้น
ดู [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) และ [Nest File Upload](https://docs.nestjs.com/techniques/file-upload)

## ก่อนเปิด Production

- Migrations apply แล้ว ให้ทดสอบ Admin กับผู้สมัครจริงจนเข้า Education ได้
- ทดสอบ upload/private image บน Storage จริง และ Preview → Publish → Education → Restore
- ตั้ง email provider/scheduler และทดลองส่งอีเมลด้วยบัญชีที่ควบคุมเอง
- ตั้ง HTTPS, domains, Supabase redirect URLs, CORS และ reverse proxy `/api` พร้อม SPA fallback
- กำหนด retention/backup/monitoring และดูแลสิทธิ์บัญชี Admin โดย Dev
- Automated tests ใช้ mocked Auth/HTTP และ isolated PostgreSQL ไม่ใช่ผลทดสอบ browser/SMTP/Storage ของ hosted project

## ผลตรวจในเครื่องรอบนี้

ตัวเลข automated checks ด้านล่างเป็นผลก่อนรอบปรับธีมและแยกหน้าสมาชิก/คำขอล่าสุด ไม่ได้รันซ้ำหลังการปรับรอบนั้นตามคำขอ
เจ้าของรายงานว่าทดสอบ flow สมาชิก, UI และ Draft/Preview/Publish/Restore ด้วยเนื้อหาตัวอย่างผ่านแล้ว
ยังต้องรัน automated checks ของโค้ดล่าสุดเมื่ออนุญาตก่อนเตรียม merge/deploy

- Build Contracts, API, Education และ Admin ผ่าน
- Admin UI 9 กรณี, API/worker 17 กรณี, isolated PostgreSQL 12 กรณี และ Education Auth 25 กรณีผ่าน
- Lint ไม่มี error มี warning เดิมสองรายการที่ MotorCameraRig
- Export HTML สำเร็จ ตรวจ GLB hash และ JavaScript syntax แล้ว ไม่พบ Supabase configuration ฝังใน demo
- Local HTTP: health 200; Admin member/content endpoints ปฏิเสธ request ที่ไม่มี token ด้วย 401
- วันที่ 14 พฤศจิกายน 2026 ตรวจ hosted catalog/security ผ่าน 18 รายการ และ migration dry-run ไม่มีงานค้าง
- ยังไม่ได้ login ผ่าน browser, upload/download รูปผ่าน hosted Storage หรือส่งอีเมลจริงในรอบนี้ ต้องตรวจรับต่อด้วยบัญชีของเจ้าของ
