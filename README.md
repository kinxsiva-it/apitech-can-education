# APITech CAN Education

Online EV/CAN teaching application for instructors, with a separate React Admin CMS and NestJS API.
Uses npm workspaces and one root package-lock.json. Node.js 22.12+ required (validated with 22.20).

## Run from the repository root

```powershell
npm install
npm run dev
```

`dev` opens Education only. Use `npm run dev:all` for the membership flow, which also needs the API.

| Command | Application | Local URL |
|---|---|---|
| npm run dev:education | Education | http://localhost:5173 |
| npm run dev:admin | Admin CMS | http://localhost:5174 |
| npm run dev:api | NestJS API | http://127.0.0.1:3000/api/health |

Ports are fixed; stop any existing task using these ports first. Frontends proxy /api to NestJS in development.

## Environment files

The original root `.env.local` has moved to **apps/education-web/.env.local** with its values preserved.
Each app owns its environment; copy its .env.example to .env.local for a fresh clone.

| File | Purpose |
|---|---|
| apps/education-web/.env.local | Browser Supabase URL and publishable key |
| apps/admin-web/.env.local | Browser Supabase URL/publishable key and optional VITE_API_URL |
| apps/api/.env.local | Port, host, CORS and future server authentication settings |

API starts with local defaults without an env file. Member endpoints need both Supabase settings; health remains public without them.
Only browser-safe values may use VITE_. Never expose secret/service-role keys to either frontend.
Real env files are ignored; examples contain placeholders only. Restart Vite after changing env.

## Repository layout

```text
apps/
  education-web/
    src/ui/                 Existing Education, EV screens and Component Lab
    src/simulator/          Pure TypeScript engine
    src/decoder/            Signal definitions/decoding
    src/store/              Zustand
    src/lib/supabase/       Browser client
    src/app/                Routes and membership gates
    src/features/auth/      Signup, login, email links and membership status
    public/assets/          GLB demo and local-only customer reference
    scripts/export-html.mjs
    tests/motor-model.test.ts
  admin-web/
    src/app/                Admin shell
    src/lib/                API access
  api/
    src/config/             Validated server configuration
    src/modules/health/     Health endpoint
    src/app.module.ts
    src/main.ts
    tests/                  HTTP integration tests
packages/contracts/         Type-only API contracts
packages/brand/             Customer logo and shared BrandLogo component
supabase/                   Schema, grants, RLS, migrations and checks
content/                    Source lesson/scenario/DBC fixtures
docs/                       Requirements and architecture
```

Frontends must not import apps/api/src. API must not import React or browser stores.
Shared contracts contain API types, never database clients or secrets; types do not replace runtime validation.

## Checks and outputs

```powershell
npm run build
npm run lint
npm run test:api
npm run test:db
npm run test:motor
npm run test:auth:ui
npm run test:admin
npm run export:html
```

Build validates contracts and builds each app. Outputs are under each app's dist/.
Standalone customer demo: apps/education-web/dist/standalone/APITech-CAN-Education.html.
`npm run preview` previews Education. After building API, start it with `npm run start --workspace=@apitech/api`.
Production needs a reverse proxy for /api or separate API URL/CORS configuration and frontend routing fallback.
Build artifacts, dependencies and real environment files are not tracked.

## Current scope

- Existing Education and interactive SVG/procedural/GLB motor views are preserved; tracked motor GLB has 63 meshes.
- CAN execution/telemetry remain unfinished. Input controls do not imply simulated CAN results.
- Admin includes member approval/status changes, institutions, notifications, audit, delivery status and text/image content management. CMS migrations were applied on 2026-11-14 after owner approval; 18 hosted catalog checks passed. See the Admin guide for browser acceptance.
- API implements health/institutions and authenticated member/Admin review endpoints. Health is not a Supabase readiness check.
- Member schema/RLS/workflow migrations were applied to the hosted project on 2026-11-13; isolated PostgreSQL tests and hosted catalog/anonymous HTTP checks passed.
- API verifies Bearer tokens with Supabase Auth and live database access, forwarding the user JWT to RPCs with RLS.
- Education opens on a public landing page with login/register links. It includes email confirmation, password recovery and server-confirmed access to /learn. See the browser testing guide below.
- The owner reports member/UI/content acceptance passed. Automated tests predate the latest visual/navigation changes and must be rerun before merge/deploy when permitted.
- Approval/rejection emails are deferred for the pilot: applicants contact the administrator directly. The worker defaults to disabled; enable only with MEMBERSHIP_EMAIL_ENABLED=true after reviewing/skipping the pilot backlog and configuring the provider. Supabase Auth confirmation/recovery remain active.
- Static demo GLB and exported review HTML remain public; route gates do not protect static assets. Future private CMS content must be authorized by the API/storage policies.
- Customer reference HTML and legacy scaffold components remain local-only inside Education.
- Production is online-only. Exported HTML is a review/demo artifact, separate from access-controlled production.

## Maintenance guides

- [Architecture](docs/ARCHITECTURE.md)
- [Membership/CMS agreements](docs/MEMBERSHIP_CMS_AGREEMENTS.md)
- [Member access design](docs/MEMBER_ACCESS_DESIGN.md)
- [Members API](docs/MEMBERS_API.md)
- [Browser membership testing](docs/MEMBER_AUTH_UI.md)
- [Admin CMS usage and acceptance](docs/ADMIN_CMS.md)
- [Postman collection and guide](tools/postman/README.md)
- [Supabase deployment verification](docs/SUPABASE_DEPLOYMENT_2026-11-13.md)
- [Branch guide](docs/BRANCH_GUIDE.md)
- [Education UI guide](apps/education-web/src/ui/README.md)
- [Component Lab](docs/EV_COMPONENT_LAB.md)
- [Standalone export](docs/STANDALONE_HTML.md)

Original customer handoff remains unchanged in docs/. See later agreements for the latest scope.
