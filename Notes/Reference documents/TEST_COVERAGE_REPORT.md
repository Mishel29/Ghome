# Test Coverage Report

Measured on 2026-09-21 after clean `npm ci` installations. Vitest V8 coverage includes production source files; source is not excluded to inflate the totals.

| Suite | Result | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend Vitest | 47/47 passed | 25.81% | 20.88% | 26.87% | 26.12% |
| Frontend Vitest | 22/22 passed | 17.84% | 14.23% | 13.68% | 22.28% |
| Playwright mocked | 12/12 passed | N/A | N/A | N/A | N/A |
| Playwright real stack | 1/1 passed | N/A | N/A | N/A | N/A |
| Backend GraphQL integration | 1/1 passed | N/A | N/A | N/A | N/A |

The real-stack browser journey creates the isolated `harborstone_e2e` Docker project, migrates and seeds only `harborstone_test`, runs Vite on `127.0.0.1`, and removes its containers, network, and volumes in teardown. It rejects external E2E URLs.

## Campaign Send Tests

Classification: **STRONG**. The mocked Nodemailer tests cover outbound behavior without a network transport, and the disposable PostgreSQL integration test verifies token/event persistence through the actual backend.

| Behavior | Status | Evidence |
| --- | --- | --- |
| Successful SMTP send | PASS | Mocked `sendMail` verifies recipient, configured `From`, subject, real-name personalization, unsubscribe link, tracked property link, provider acceptance, recipient `SENT` state, and `SENT` event. |
| Failed SMTP send | PASS | Thrown SMTP errors, explicit recipient rejection, and missing recipient acceptance persist `FAILED` recipient and delivery-attempt states without crashing the campaign. |
| Per-recipient continuation | PASS | One failed recipient does not prevent a later recipient result from being persisted. |
| Consent filtering | PASS | Delivery selects only `ACTIVE` subscribers with a non-null marketing consent timestamp. |
| Invalid-address exclusion | PASS | An active, consented subscriber with an invalid email address is excluded; an empty eligible audience marks the campaign `FAILED` without attempting SMTP. |
| Interest follow-up acceptance | PASS | Follow-ups use the shared transport and configured `From`, then persist `SENT` only when the intended recipient is accepted. |
| Unsubscribe exclusion | PASS | The integration fixture includes an unsubscribed subscriber; campaign preview/send eligibility excludes it. |
| Campaign unsubscribe link | PASS | Mocked campaign HTML includes a tokenized `/unsubscribe` URL. |
| Interest follow-up unsubscribe link | PASS | Mocked follow-up HTML includes its tokenized `/unsubscribe` URL. |
| No open tracking | PASS | Mocked campaign HTML contains no `/campaign-open` URL or open-tracking pixel; the retired endpoint returns `404`. |
| Click, save, and interest events | PASS | Disposable integration and real-stack browser tests preserve existing attribution behavior. |
| Campaign statistics | PASS | Daily and campaign-level click/save/interest/unsubscribe totals are verified without open metrics. |

## Email-open Tracking

- Email-open tracking is intentionally not implemented because image loading is unreliable.
- `GET /campaign-open/:token` is not exposed.
- The historical Prisma `OPENED` enum value is retained for production migration safety and has no active runtime use.

## GitHub Actions CI

Workflow: `.github/workflows/ci.yml`

Triggers:

- `push`
- `pull_request`

Checks:

- Backend: `npm ci`, Prisma validation and generation, build, and unit tests.
- Backend integration: GitHub Actions PostgreSQL service using only `harborstone_test`, migrations, and the guarded integration test.
- Frontend: `npm ci`, typecheck, lint, unit tests, and production build.
- Playwright: mocked journey suite with the bundled Chromium installed in CI.

No production database URL, SMTP credential, administrator password, or API key is used by the workflow.

## Production Verification

| Check | Status |
| --- | --- |
| Backend clean install, Prisma validate/generate, build, and unit tests | PASS |
| Backend Docker build and safe migration startup definition | PASS |
| Disposable PostgreSQL integration | PASS |
| Frontend clean install, typecheck, lint, tests, coverage, and build | PASS |
| Mocked Playwright journeys | PASS |
| Disposable real-stack Playwright journey | PASS |
| Render configuration, reverse proxy, rate limiter, and public backend campaign-link URL pattern | PASS by source/configuration verification |
| Vercel environment-driven GraphQL build and SPA routing | PASS by source/configuration verification |

## Remaining Gaps And Risks

- Global coverage remains below 25% because the report includes the full resolver, import flows, scripts, and many public/admin views. Focused campaign delivery and attribution coverage is strong.
- `npm audit --omit=dev` reports four high-severity advisories through the Prisma CLI's transitive `deepmerge-ts` and `mysql2` dependencies. This PostgreSQL application does not use the MySQL transport, and npm's only suggested fix is an unsafe Prisma 7-to-6 downgrade. Track an upstream non-breaking Prisma remediation before the next dependency refresh.
- Background email queues, ISR/static generation, and direct image uploads remain intentionally deferred product enhancements.

## Commands And Artifacts

```bash
# Code/backend
npm ci
npx prisma validate
npx prisma generate
npm run build
npm test
npm run test:coverage
npm run test:integration

# Code/frontend/my-react-app
npm ci
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm run test:e2e
npm run test:e2e:real
```

- Backend HTML coverage: `Code/backend/coverage/backend/index.html`
- Backend LCOV: `Code/backend/coverage/backend/lcov.info`
- Frontend HTML coverage: `Code/frontend/my-react-app/coverage/frontend/index.html`
- Frontend LCOV: `Code/frontend/my-react-app/coverage/frontend/lcov.info`
- Mocked Playwright report: `Code/frontend/my-react-app/playwright-report/index.html`
- Real-stack Playwright report: `Code/frontend/my-react-app/playwright-report/real-stack/index.html`
