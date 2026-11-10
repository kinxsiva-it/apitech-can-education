# APITech CAN Education

Online EV/CAN teaching application for instructors, with a separate React Admin CMS and NestJS API.
Uses npm workspaces and one root package-lock.json. Node.js 22.12+ required (validated with 22.20).

## Run from the repository root

```powershell
npm install
npm run dev
```

`dev` opens Education only. Use `npm run dev:all` to start all three applications.

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
| apps/admin-web/.env.local | Optional VITE_API_URL; empty means same-origin /api |
| apps/api/.env.local | Port, host, CORS and future server authentication settings |

API starts with local defaults without an env file. Its Supabase settings are reserved for the next auth module.
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
supabase/                   Future schema, grants, RLS and migrations
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
npm run test:motor
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
- Admin is a starter screen with API health checking, not completed member/content management.
- API implements /api/health and configuration/CORS, not membership endpoints or Supabase readiness checks.
- Login, JWT guards, RLS, migrations and email delivery are not implemented. Current demo and GLB remain public.
- Customer reference HTML and legacy scaffold components remain local-only inside Education.
- Production is online-only. Exported HTML is a review/demo artifact, separate from access-controlled production.

## Maintenance guides

- [Architecture](docs/ARCHITECTURE.md)
- [Membership/CMS agreements](docs/MEMBERSHIP_CMS_AGREEMENTS.md)
- [Member access design](docs/MEMBER_ACCESS_DESIGN.md)
- [Branch guide](docs/BRANCH_GUIDE.md)
- [Education UI guide](apps/education-web/src/ui/README.md)
- [Component Lab](docs/EV_COMPONENT_LAB.md)
- [Standalone export](docs/STANDALONE_HTML.md)

Original customer handoff remains unchanged in docs/. See later agreements for the latest scope.
