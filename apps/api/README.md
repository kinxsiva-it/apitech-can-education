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
ยังไม่มี auth guard หรือ endpoints ข้อมูลธุรกิจ จึงไม่มีข้อมูลสมาชิกให้เรียกใช้ในรอบนี้

ตั้งค่า port/host/CORS ที่ `apps/api/.env.local` โดยใช้ `.env.example` เป็นตัวอย่าง
ไม่ copy secret ของ API ไปแอป frontend
ดูหน้าที่แต่ละโมดูลที่ [Architecture](../../docs/ARCHITECTURE.md)
