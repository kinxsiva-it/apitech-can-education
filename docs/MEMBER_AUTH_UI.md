# Education: ระบบสมาชิกและขั้นตอนทดสอบผ่านเว็บ

อัปเดต 13 พฤศจิกายน 2026 — branch `features/member-auth-ui`
ฐานคือ `features/member-access-foundation` commit `83dfbe5` ยังไม่รวม main
เมื่อรวมงานให้รวม foundation ก่อน แล้วตรวจ branch นี้อีกครั้งตาม BRANCH_GUIDE.md

## เปิดใช้งาน

รันจาก root ของ repo:

```powershell
npm install
npm run dev:all
```

เปิด **http://localhost:5173** จะพบหน้า Landing แนะนำสื่อการสอน กด **เข้าสู่ระบบ** เพื่อไป `/login` หรือ **สมัครบัญชีอาจารย์** เพื่อไป `/register`
หน้า Landing เป็นข้อมูลสาธารณะ ส่วนพื้นที่เรียน `/learn` ยังตรวจ session และสิทธิ์จาก API
Education ใช้ env ที่ `apps/education-web/.env.local` และ API ใช้ `apps/api/.env.local`
ใช้ Supabase project เดียวกันทั้งสองฝั่ง มี URL และ publishable key ตาม `.env.example`
`VITE_API_URL` ปล่อยว่างเพื่อให้ Vite proxy `/api` ไป NestJS port 3000
หากระบุ API origin ให้ใส่เฉพาะ origin เช่น `https://api.example.com` ไม่เติม `/api`
แก้ env แล้ว restart process; ห้ามใส่ secret/service-role key ใน frontend

## ตั้งค่าลิงก์อีเมล

เปิด Supabase Dashboard → Authentication → URL Configuration ของ project นี้
คง Site URL ของเครื่องพัฒนาเป็น `http://localhost:5173` และเพิ่ม Redirect URLs:

```text
http://localhost:5173
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
```

ถ้าใช้ `127.0.0.1` ให้เพิ่มชุด URL ของ host นั้นด้วย และเปิดเว็บ/อีเมลโดยใช้ host เดียวกัน
อย่าลบ URL ที่ environment อื่นยังใช้งาน การเพิ่ม path เหล่านี้ต้องตรวจใน Dashboard ก่อนทดสอบจริง
งานรอบนี้ไม่ได้เปลี่ยน hosted Auth URL settings ให้อัตโนมัติ
Confirm email ต้องเปิดอยู่ หากแก้ email template เอง ให้ใช้ redirect ที่ส่งมากับคำขอตามเอกสาร Supabase

Default SMTP มีข้อจำกัดผู้รับและ rate limit ตามบริการ ก่อนเปิดสมัครบุคคลทั่วไปต้องตั้ง custom SMTP
ใช้ลิงก์ล่าสุดครั้งเดียว ลิงก์หมดอายุ/ถูกใช้แล้วจะแสดงหน้าขอลิงก์ใหม่
ดู [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) และ [Password Auth](https://supabase.com/docs/guides/auth/passwords)

## ทดลองด้วยบัญชีจริง

1. เปิด `/register` กรอกชื่อ อีเมล รหัสผ่านและยืนยันรหัสผ่าน สถาบันไม่บังคับ ค้นหา/เลือกจาก API หรือเลือก “อื่น ๆ” แล้วระบุเอง
2. สมัครแล้วเปิด Inbox/Spam กดลิงก์ล่าสุด ระบบตรวจ session และสิทธิ์จาก API ถ้าไม่มี session ให้ Login ด้วยรหัสผ่านที่สมัคร
3. บัญชีใหม่ที่ยืนยันแล้วอยู่หน้า **รอผู้ดูแลอนุมัติ** เปิด `/learn` โดยตรงก็ยังเข้าเรียนไม่ได้
4. ใช้บัญชี Admin ผ่าน Postman ทำ approve ตาม [คู่มือ Postman](../tools/postman/README.md) ตอนนี้หน้า Admin CMS ยังเป็น starter
5. กลับหน้าเว็บกด **ตรวจสถานะล่าสุด** จะเข้าสู่ Education ทุกเมนูเมื่อ API ยืนยัน approved แล้ว
6. ทดลอง reject พร้อมเหตุผล: ผู้ใช้เห็นเหตุผล แก้ชื่อ/สถาบัน แล้วส่งคำขอใหม่ ระบบบันทึก profile ก่อนส่ง revision ล่าสุดให้ API
7. ทดลอง suspend: เมื่อหน้าเว็บตรวจสิทธิ์รอบถัดไปจะออกจากพื้นที่เรียนไปหน้าแจ้งระงับ บัญชีนี้ส่งคำขอซ้ำเองไม่ได้ ให้ Admin restore
8. กด **ออกจากระบบ** ที่มุมบนของพื้นที่เรียน จากนั้นลองเปิด `/learn` และ reload ต้องกลับหน้า Login
9. ที่ Login ใช้ **ลืมรหัสผ่าน** รับลิงก์ใหม่ เปิด `/reset-password` จากอีเมล ตั้งรหัสใหม่ แล้ว Login อีกครั้ง การเปิด URL เองโดยไม่มี recovery session จะไม่แสดงฟอร์มเปลี่ยนรหัส
10. ทดลองหยุด API แล้ว Login ด้วยบัญชี approved: ต้องแจ้งตรวจสอบสิทธิ์ไม่ได้ กด retry ได้ และไม่เปิดพื้นที่เรียน

อีเมลและรหัสผ่านทดสอบกรอกในเว็บ/Postman ของคุณ ไม่ต้องส่งในแชต
การส่งอีเมลยืนยัน/รีเซ็ตรหัสเป็นของ Supabase Auth ส่วนอีเมลผลอนุมัติ/ปฏิเสธยังรอ email worker
การทดสอบอัตโนมัติไม่ส่งอีเมลหรือเปลี่ยนบัญชีใน hosted project

## โครงสร้างที่ใช้แก้ไข

| ตำแหน่ง | หน้าที่ |
|---|---|
| `apps/education-web/src/ui/landing/` | หน้า Landing และ CSS แยกจากสื่อการสอนที่ต้องมีสิทธิ์ |
| `apps/education-web/src/app/AuthRoutes.tsx` | URL และ guards สำหรับ guest/session/พื้นที่เรียน |
| `src/features/auth/AuthProvider.tsx` | Session, โหลดสิทธิ์จาก API, refresh และ local logout |
| `src/features/auth/pages/` | Login/Register, email links, recovery และสถานะสมาชิก |
| `src/features/auth/components/` | Layout, รหัสผ่าน, ตัวเลือกสถาบัน และฟอร์มส่งคำขอใหม่ |
| `src/features/auth/membership-api.ts` | Typed HTTP adapter และตรวจ response ตอน runtime |
| `src/features/auth/auth-links.ts` | แปลงสถานะลิงก์และ error เป็นข้อความที่ใช้ใน UI |
| `src/features/auth/auth.css` | รูปแบบหน้าสมาชิก รองรับมือถือและ reduced motion |
| `src/lib/supabase/client.ts` | Browser Auth client; ไม่ใช่ server/admin client |
| `tests/auth-ui.test.tsx` | ทดสอบ routes/forms กับ mocked SDK และ HTTP |
| `src/demo-main.tsx` | Entry สำหรับ HTML review demo ที่ไม่ใช้ระบบสมาชิก |

path ที่เริ่ม `src/` หรือ `tests/` ในตารางอยู่ภายใต้ `apps/education-web/`
UI ไม่เรียก database tables โดยตรง ไม่ใช้ role จาก signup metadata เพื่อตัดสินสิทธิ์
ทุก request ธุรกิจส่ง Bearer token ไป NestJS ที่ตรวจ Auth และสถานะสดใน DB

## การตรวจสิทธิ์และข้อจำกัด

- อ่านสิทธิ์เมื่อ session เปลี่ยน กลับมา focus/visible และทุก 30 วินาทีขณะเปิดหน้าเว็บ
- refresh background คง component บทเรียนเดิมระหว่างตรวจ เพื่อไม่ล้าง state ระหว่างสอน
- ถ้าตรวจไม่ได้/response ไม่ตรง user/ข้อมูลสิทธิ์ไม่สมบูรณ์ จะปิดพื้นที่เรียนและให้ retry/login
- UI อาจแสดงข้อมูลเดิมช่วงรอ refresh แต่ API ยังตรวจสิทธิ์ทุก request จึงไม่ใช้ polling แทน authorization ฝั่ง server
- Route guards เป็นการควบคุม UI เท่านั้น GLB ที่อยู่ `public` และ content ตัวอย่างใน bundle ยังดาวน์โหลดได้
- เนื้อหา CMS ส่วนตัวในอนาคตต้องโหลดผ่าน authorized API/private storage; งานนี้ยังไม่ได้ย้าย demo assets เข้า private storage
- Logout ใช้ scope local มีผลกับ browser นี้; ล้างเฉพาะ Auth storage ของแอปเมื่อ server ติดต่อไม่ได้
- HTML export เป็น review/demo สาธารณะ ไม่ใช้แทน production ที่มีระบบสมาชิก และไม่ฝัง session/env ลงไฟล์
- Production hosting ต้อง fallback เส้นทาง frontend เช่น `/auth/callback`, `/reset-password`, `/learn` ไป `index.html` และ proxy `/api` หรือกำหนด API origin/CORS ให้ถูกต้อง

## ตรวจในเครื่อง

```powershell
npm run test:auth:ui
npm run build
npm run lint
npm run test:motor
npm run export:html
```

UI tests ตรวจ flow และการปิดสิทธิ์ด้วยข้อมูลจำลอง ไม่ใช่ผลทดสอบส่งอีเมล/ยืนยันลิงก์บน browser จริง
ให้ตรวจรับด้วยขั้นตอนด้านบนอีกครั้งก่อน merge/deploy
