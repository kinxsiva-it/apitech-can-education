# ฐานข้อมูล Supabase

โฟลเดอร์นี้เป็นเจ้าของ schema, grants, RLS และ RPC ที่จะสร้างผ่าน migrations
ยังไม่มี SQL migrations และยังไม่ได้ apply ข้อมูลใดบน Supabase ในรอบจัดโครงสร้าง

- NestJS API อยู่ `apps/api/`; ไม่เขียน schema แยกซ้ำด้วย ORM auto-sync
- เมื่อเริ่มงานให้สร้าง migration แบบมี version ใต้ `supabase/migrations/`
- เพิ่มชุดทดสอบสิทธิ์ anon/authenticated/Admin ควบคู่กับ migration
- ห้ามใช้ service role เพียงอย่างเดียวในการทดสอบ RLS
- ไม่เก็บรหัสผ่านฐานข้อมูล access token หรือ secret ในโฟลเดอร์นี้
- seed ใช้ข้อมูลตัวอย่าง ไม่ใส่บัญชี Admin จริงหรือ credentials

แบบระบบ: [Member access design](../docs/MEMBER_ACCESS_DESIGN.md)
