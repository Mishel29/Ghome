# Harborstone Homes — Repository Audit Report

## 1. Current Architecture Summary

Full-stack property marketing platform with public website, admin CMS, and email campaigns.

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Recharts |
| Backend | Express 5, `graphql` + `graphql-http`, TypeScript, Node 22 |
| Database | PostgreSQL 16 via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Bearer tokens (SHA-256 hashed in `Session`), 8h expiry, `sessionStorage` |
| Email | Nodemailer (Brevo SMTP), synchronous per-recipient sends |
| Deployment | Docker multi-stage builds; Render (backend + PostgreSQL), Vercel (frontend) |
| CI/CD | `docker-compose` for local; `npm ci` in Docker; Prisma `migrate deploy` |

### Key architectural notes

- `server.ts` contains SDL, resolvers, validation, import logic, SMTP, and Express routes; there is no separate service/repository layer.
- Frontend uses hand-written GraphQL queries plus separate `schemaTypes.ts`; no code generation is currently used.
- Prisma client is generated to `src/generated` and committed.
- AI/RAG/Redis/BullMQ dependencies exist but have no active runtime consumers.

---

## 2. Repository Structure

```text
Mishel/
├── Code/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 916 lines, 50+ models
│   │   │   └── migrations/            # 5 migrations (init → schema_alignment)
│   │   ├── src/
│   │   │   ├── server.ts              # 2108 lines — all backend logic
│   │   │   ├── lib/prisma.ts          # PrismaClient singleton
│   │   │   ├── scripts/adminBootstrap.ts
│   │   │   ├── import/                # CSV + historical prices
│   │   │   ├── integration/           # Real DB GraphQL tests
│   │   │   ├── types/                 # nodemailer, sanitize-html
│   │   │   └── generated/             # Prisma client (committed)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── .env                       # local only
│   └── frontend/my-react-app/
│       ├── src/
│       │   ├── api/                   # graphql.ts, properties.ts, imports.ts, schemaTypes.ts
│       │   ├── views/                 # Public + admin pages
│       │   ├── components/
│       │   ├── lib/
│       │   ├── routes/
│       │   ├── context.tsx
│       │   ├── data.ts
│       │   ├── main.tsx
│       │   └── App.tsx
│       ├── e2e/journeys.spec.ts       # Playwright (mocked GraphQL)
│       ├── Dockerfile
│       ├── nginx.conf
│       ├── package.json
│       └── .env                       # local only
├── Notes/                             # Requirements, schema docs, datasets
├── docker-compose.yml                 # Postgres + backend + frontend
├── PROJECT_CONTEXT.md
├── ALIGNMENT_AUDIT.md
├── PRODUCTION_READINESS.md
└── README.md
```

---

## 3. Major Dependency Map

### Property schema changes

```text
Prisma schema change
  → migration (`npx prisma migrate dev`)
  → `npx prisma generate` (`src/generated`)
  → backend SDL/resolvers/serializers (`server.ts`)
  → GraphQL types (`buildSchema` string)
  → frontend `schemaTypes.ts` (manual sync)
  → frontend queries (`properties.ts`, `imports.ts`, etc.)
  → UI components (PropertyCard, PropertyDetail, admin forms)
  → CSV import (`propertyCsvSchema.ts` → `importProperties.ts`)
  → analytics/historical prices (`valueHistory` → `historicalPrices`)
  → tests (integration + unit)
```

### Auth/User changes

```text
Session model + password hash (scrypt)
  → `requireUser` / `requireAdmin` (`server.ts`)
  → GraphQL context (`Authorization` header)
  → frontend `sessionStorage` + AppProvider + RequireAdmin route guard
  → SavedProperty ownership (`userId` FK + unique constraint)
```

### Campaigns

```text
Campaign / Recipient / Event / Template models
  → `sendCampaign` (synchronous loop, Nodemailer)
  → `/campaign-click` / unsubscribe HTTP endpoints
  → subscriber consent (`ACTIVE` + `consentGrantedAt`)
  → frontend campaign log + statistics
```

### Imports

```text
PropertyImportUpload
  → validate
  → resolve duplicates
  → startPropertyImport
  → transaction per row (property + media + valueHistory)
  → draft reset on import/replace
  → ImportJob / ImportChunk / ImportRowError persisted
```

> No active background queue worker currently processes imports.

### News

```text
NewsArticle (`publicationStatus` + `activeFrom` / `activeUntil`)
  → public resolver filters published + active dates
```

---

## 4. Feature Status Classification

| Feature | Status | Notes |
|---|---|---|
| Public property listing/detail | COMPLETE | Filters, pagination, `publicationStatus=PUBLISHED` enforced server-side |
| Property comparison | COMPLETE | Up to 4 properties, client-side |
| Mortgage calculator | COMPLETE | Client-side, records analytics event |
| Saved properties (auth + anon) | COMPLETE | Anonymous = localStorage; Auth = DB with ownership enforcement |
| Expressions of interest | COMPLETE | Requires consent + published property; creates subscriber + consent + interest |
| Property analytics (growth charts) | COMPLETE | Normalized `PropertyValueHistory` → frontend `historyGrowth` |
| News (admin + public) | COMPLETE | Draft/publish, active dates, property links, public visibility enforced |
| Admin property CRUD | COMPLETE | Manual form + CSV import, draft/publish, media, features |
| CSV property import | COMPLETE | Synchronous, validation, duplicate handling (`SKIP`/`REPLACE`), draft reset |
| CSV subscriber import | COMPLETE | Separate flow, consent on import |
| Campaigns (create/send/preview) | COMPLETE | Synchronous send, draft guard, tracking tokens, events |
| Campaign statistics | COMPLETE | Daily aggregates from `CampaignEvent` |
| Subscriber management | COMPLETE | CRUD, export, consent, unsubscribe token flow |
| User management (admin) | COMPLETE | Create user, admin toggle, password hash |
| Admin bootstrap | COMPLETE | `npm run admin:bootstrap` from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env |
| RAG chatbot | PARTIAL | `propertyAssistant` resolver exists but no RAG pipeline; returns mocked data |
| AI home tour generation | INACTIVE | Models exist (`AiJob`, `AiJobAttempt`), no active resolver/worker |
| Background queue (BullMQ) | INACTIVE | Installed, models exist (`ImportChunk`, `ImportJob`), no worker |
| Redis | INACTIVE | No client, no config in `.env.example` |
| MCP/Dashscope | INACTIVE | SDK installed, no integration code |
| E2E tests (real DB) | MISSING | Playwright mocks GraphQL; one integration test file exists for manual run |

---

## 5. Current Deployment Architecture

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Render        │     │   Render PG     │
│   Frontend      │────▶│   Backend       │────▶│   PostgreSQL    │
│   dist/         │     │   Docker        │     │   Migrations    │
│   VITE_GRAPHQL  │     │   PORT=4000     │     │   deploy        │
└─────────────────┘     │   /healthz      │     └─────────────────┘
                        │   /readyz       │
                        │   CORS via      │
                        │   PUBLIC_APP_URL│
                        └────────┬────────┘
                                 │ SMTP (Brevo)
                                 ▼
                        ┌─────────────────┐
                        │  External SMTP  │
                        └─────────────────┘
```

### Backend Dockerfile flow

```text
build:
npm ci
→ prisma generate
→ tsc

run:
prisma migrate deploy
→ admin:bootstrap
→ node dist/server.js
```

### Production environment variables

- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_FROM_EMAIL`
- `MAIL_FROM_NAME`
- `PUBLIC_APP_URL`
- `PUBLIC_BACKEND_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

---

## 6. Test Status

| Suite | Command | Status | Coverage |
|---|---|---|---|
| Backend unit | `npm test` | 11 pass | Historical prices, CSV headers, subscriber stats |
| Backend integration | `npm run test:integration` | 1 test file | Real PG: publication, saved ownership, CSV import, campaign consent/unsubscribe, news visibility |
| Frontend typecheck | `npm run typecheck` | PASS | — |
| Frontend lint | `npm run lint` | PASS | — |
| Frontend unit | `npm test` | 5 pass | Calculations, Users component |
| Frontend build | `npm run build` | PASS | Warning: large chunk |
| Playwright E2E | `npm run test:e2e` | 12 pass | GraphQL mocked; no real DB/SMTP/import validation |

### Critical test gap

No automated integration tests currently cover:

- SMTP
- Redis
- BullMQ
- AI
- CSV import end-to-end in CI

---

## 7. Critical / High Risks

| Risk | Severity | Details |
|---|---|---|
| GraphQL contract drift | CRITICAL | SDL (`server.ts`) ↔ resolver output ↔ frontend `schemaTypes.ts` ↔ query strings are hand-maintained; no codegen/validation |
| Synchronous campaign send | HIGH | Loops over all recipients in one request; no retry or durability |
| Synchronous CSV import | HIGH | Transaction per row; large files may time out |
| RAG/AI/Queue dead code | HIGH | `AiJob`, `RagDocument`, `ImportChunk`, BullMQ, MCP SDK, Redis deps create false expectations |
| No unique constraint on property name | MEDIUM | Concurrent imports can race; duplicate detection is application-level only |
| Content-Length-only body limit | MEDIUM | Chunked transfer encoding can bypass the 12 MB guard |
| Stale `PROJECT_HANDOFF.md` | MEDIUM | Conflicts with current campaign/import implementation |
| Frontend large bundle | LOW | Vite warns about chunk size; no code-splitting audit |
| Secrets in source risk | LOW | `.env` files exist locally; gitignored but present |

---

## 8. Most Important Files for Future Work

| File | Purpose |
|---|---|
| `Code/backend/src/server.ts` | GraphQL SDL, resolvers, auth, import, email, HTTP endpoints |
| `Code/backend/prisma/schema.prisma` | Database schema: models, relations, constraints, enums |
| `Code/backend/prisma/migrations/` | Migration history; add new migrations rather than editing existing ones |
| `Code/frontend/my-react-app/src/api/schemaTypes.ts` | Frontend TypeScript contract; must stay aligned with backend SDL |
| `Code/frontend/my-react-app/src/api/properties.ts` | GraphQL queries + viewProperty mapper |
| `Code/frontend/my-react-app/src/context.tsx` | Global auth, saved properties, comparison, property cache |
| `Code/backend/src/import/importProperties.ts` | CSV import transaction logic |
| `Code/backend/src/import/historicalPrices.ts` | Historical price validation and normalization |
| `Code/backend/src/scripts/adminBootstrap.ts` | Initial admin creation |
| `Code/backend/src/integration/graphql.integration.test.ts` | Real DB integration tests |
| `docker-compose.yml` | Local full-stack environment |
| `Code/backend/Dockerfile` | Backend production image |
| `Code/frontend/my-react-app/Dockerfile` | Frontend production image |

---

## 9. Recommended Next Action

Do not implement new features yet. First establish safeguards for future changes.

1. **Add GraphQL contract validation**
   - Prefer GraphQL Code Generator to generate frontend operation/types from backend SDL.
   - At minimum, add a CI contract validation step.

2. **Keep architecture documentation current**
   - Update `ALIGNMENT_AUDIT.md` whenever cross-layer contracts change.
   - Optionally maintain a `CHANGELOG.md`.

3. **Expand integration coverage**
   - Campaign sending with mocked SMTP and recipient/event persistence.
   - CSV import edge cases: concurrency, rollback, historical validation.
   - Authentication/session expiry and rotation.

4. **Clarify inactive AI/queue code**
   - Remove or clearly document inactive RAG/AI/BullMQ/Redis/MCP models and dependencies.
   - Avoid implying these features are live when they are not.

5. **Verify production configuration**
   - Ensure `PUBLIC_APP_URL`, `PUBLIC_BACKEND_URL`, SMTP credentials, and `DATABASE_URL` are supplied through deployment secret managers.
   - Do not place production secrets in source-controlled files.

After these guardrails are in place, future changes can be implemented with substantially lower risk of breaking cross-layer alignment.
