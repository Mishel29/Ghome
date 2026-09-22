# Production Readiness Gate

Date: 2026-09-18

## Verdict: PASS - PRODUCTION READY

All critical and high release gates executed in this workspace pass. Deploy only after configuring production secrets and taking a verified database backup.

## Environment

- Docker Desktop 27.3.1 and Compose 2.29.7 were available.
- Disposable environment: `docker compose -p harborstone_release_gate` with a new Postgres 16 Alpine volume.
- No real SMTP, paid AI, Redis, or external API call was made.
- Email was unconfigured in the release stack; campaign sends were not invoked.

## Release Gates

| Gate | Result | Evidence |
|---|---|---|
| Backend TypeScript build | PASS | `npm run build` completed. |
| Backend unit tests | PASS | `npm test`: 11 passed, 0 failed. |
| Frontend type check | PASS | `npm run typecheck` completed. |
| Frontend lint | PASS | `npm run lint` completed. |
| Frontend unit tests | PASS | `npm test`: 5 passed, 0 failed. |
| Frontend production build | PASS with warning | `npm run build` completed; Vite reported a large chunk warning. |
| Prisma schema validation | PASS | `npx prisma validate` completed. |
| Prisma client generation | PASS | `npx prisma generate` completed. |
| Strict Docker dependency install | PASS | Clean Linux Docker builds complete with `npm ci` for backend and frontend. |
| Docker image builds | PASS | Backend and frontend images build with strict lockfile installs. |
| Docker startup | PASS | Postgres, backend, and frontend containers reached healthy status. |
| Empty database migration deploy | PASS | All five migrations apply to a new disposable PostgreSQL 16 database. |
| Upgrade-path migration verification | PASS | A database at the four-migration pre-fix state upgraded with the corrective migration and reported schema current. |
| Real GraphQL public property smoke test | PASS | `{ properties { totalCount } }` returned a real PostgreSQL-backed response after fresh migration deployment. |
| Health endpoint | PASS | `GET /healthz` returned `200 {"status":"ok"}`. |
| Readiness endpoint | PASS | `GET /readyz` returned `200 {"status":"ready"}` against disposable Postgres. |
| Security headers | PASS | `X-Content-Type-Options: nosniff` observed; Helmet is active. |
| CORS allowed origin | PASS | Preflight from `http://localhost:5173` returned `204` with matching allow-origin header. |
| CORS disallowed origin | PASS | Cross-origin response did not expose allow-origin header for `https://evil.example`. |
| Admin authorization | PASS | Anonymous `publishProperties` mutation returned `Authentication required`. |
| Rate limiting | PASS | The 301st GraphQL request returned `429`. |
| Request content-length limit | PARTIAL | A 12 MB `Content-Length` guard exists; chunked transfer bodies were not exercised. |
| Internal error disclosure | PASS for observed failure | Real Prisma schema error was returned as `Internal server error`, not raw Prisma SQL details. |
| Graceful shutdown | PASS | `docker compose stop backend` delivered SIGTERM; backend logged closure and stopped cleanly. |
| Real saved-property ownership | PASS | PostgreSQL-backed GraphQL test verifies user isolation and anonymous denial. |
| Real CSV import transaction | PASS | PostgreSQL-backed GraphQL test verifies duplicate replacement, draft reset, historical persistence, and invalid-history rejection. |
| Real campaign consent/unsubscribe | PASS | PostgreSQL-backed GraphQL test verifies active-consented selection, unsubscribed exclusion, state update, and attributed event. SMTP was intentionally not invoked. |
| Real news publication visibility | PASS | PostgreSQL-backed GraphQL test verifies active published news visible and future/draft records hidden. |
| Full Playwright suite | PASS | `npm run test:e2e`: 12 passed, 0 failed. GraphQL is mocked in this UI-only suite. |

## Exact Commands Run

```powershell
docker --version
docker compose version
git status --short
npx prisma validate
npx prisma generate
npm run build
npm test
npm run typecheck
npm run lint
npm test
npm run build
docker build --no-cache -t harborstone-backend-release -f Code/backend/Dockerfile Code/backend
docker compose -p harborstone_release_gate build --no-cache
docker compose -p harborstone_release_gate down -v --remove-orphans
docker compose -p harborstone_release_gate up --build -d
docker compose -p harborstone_release_gate ps
docker compose -p harborstone_release_gate logs --no-color backend postgres --tail=80
docker compose -p harborstone_release_gate exec -T backend npx prisma migrate status
docker compose -p harborstone_release_gate exec -T backend sh -c 'npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script'
npm audit --omit=dev --json
```

Real HTTP checks used `fetch` against containerized `http://localhost:4000` for health, readiness, CORS, GraphQL authorization, rate limiting, and error masking. No production database was accessed.

## Critical and High Blockers

### Resolved: Prisma migration history

Forward migration `20260918160000_schema_alignment` reconciles the five-enum, table, column, index, and foreign-key drift without rewriting historical migrations. Fresh and four-migration upgrade paths were executed against disposable PostgreSQL 16 databases. Prisma reported an empty schema diff after upgrade.

### Resolved: Production dependencies

`xlsx` and unused `exceljs` were removed. CSV parsing uses the existing `csv-parse` dependency. Backend `npm audit --omit=dev --json` now reports 0 vulnerabilities.

### Resolved: Reproducible Docker install

Backend Prisma CLI peer dependencies are explicit development dependencies and both package lockfiles were refreshed. Clean Linux Docker builds now use `npm ci` successfully.

## Residual Risks

- GraphQL operations still use hand-written frontend query strings and separately maintained TypeScript types.
- Input-size enforcement relies on `Content-Length`; streamed request-body enforcement needs a dedicated reverse-proxy/application limit test.
- Campaign delivery and imports remain synchronous, not durable queue workflows.
- Vite reports a large production JavaScript bundle.
- Production SMTP credentials are intentionally absent from Docker Compose and must be delivered through secret management.

## Migration and Rollback Notes

1. The forward alignment migration is required before application deployment. Run `npx prisma migrate deploy` once per production database deployment.
2. Database rollback is not automatic for schema migration. Take a verified backup and use a rehearsed restore procedure.
3. The alignment migration includes data backfills for legacy campaign recipients and news publication fields; run it first in a staging clone of production data.

## Deployment Checklist After Blockers Are Resolved

- [x] Reconcile migrations with `schema.prisma`; deploy successfully to empty and upgrade databases.
- [x] Restore strict `npm ci` Docker builds for both images.
- [x] Resolve backend production dependency audit findings.
- [x] Add/run PostgreSQL GraphQL integration tests for publication security, saved ownership, CSV duplicate/transaction behavior, campaign consent/unsubscribe, and news visibility.
- [ ] Set production `DATABASE_URL`, SMTP variables, `PUBLIC_APP_URL`, `PUBLIC_BACKEND_URL`, and allowed origin through secret management.
- [ ] Verify HTTPS/TLS termination, proxy trust settings, backup/restore, monitoring, and alerting in the deployment platform.
- [ ] Re-run this release gate and require all critical/high gates to pass.
