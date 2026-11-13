# APITech API

NestJS + TypeScript, ESM, modular monolith ใช้ root npm workspaces ไม่ใช้ Nest CLI monorepo ซ้อนอีกชั้น
Build ด้วย TypeScript ที่รองรับ decorator metadata แล้ว start ด้วย Node.js

รันจาก root:

```powershell
npm run dev:api
npm run build:api
npm run test:api
```

Health endpoint: `GET http://127.0.0.1:3000/api/health`
Health บอกว่า API ตอบได้ ไม่ได้ตรวจการเชื่อมต่อ Supabase
มี Global AuthGuard และ endpoints สมาชิก/อนุมัติแล้ว แต่ยังไม่ apply migrations หรือทดสอบกับ hosted Supabase
ดูรายการ endpoint ที่ [Members API](../../docs/MEMBERS_API.md)

ตั้งค่า port/host/CORS ที่ `apps/api/.env.local` โดยใช้ `.env.example` เป็นตัวอย่าง
ตั้ง SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY สำหรับ member endpoints ไม่ใช้ secret/service-role
Guard ใช้ Auth getUser ตรวจ token อ่านสิทธิ์ล่าสุดจาก DB และส่ง JWT ต่อ RPC เพื่อคง RLS
ไม่ copy secret ของ API ไปแอป frontend
ดูหน้าที่แต่ละโมดูลที่ [Architecture](../../docs/ARCHITECTURE.md)
