# Test Coverage Report

## Executive Summary

Measured on 2026-09-20. Vitest V8 coverage includes production source files; business modules are not excluded to inflate results.

| Suite | Result | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend Vitest | 35/35 passed | 21.60% | 16.56% | 21.07% | 21.90% |
| Frontend Vitest | 20/20 passed | 17.54% | 13.75% | 13.57% | 21.84% |
| Playwright mocked | 12/12 passed | N/A | N/A | N/A | N/A |
| Playwright real stack | 1/1 passed | N/A | N/A | N/A | N/A |
| Backend GraphQL integration | 1/1 passed | N/A | N/A | N/A | N/A |

The real-stack browser journey starts a local Docker project named `harborstone_e2e`, migrates and seeds only the `harborstone_test` database, runs Vite against `127.0.0.1`, and removes containers, network, and volumes in teardown. It rejects external `E2E_BASE_URL` and `E2E_GRAPHQL_URL` values. The seed requires both `E2E_TEST_MODE=true` and the Docker `postgres` host with a database ending in `_test`.

## Backend Coverage by Area

| Area | Classification | Evidence |
| --- | --- | --- |
| Auth and authorization | ADEQUATE | Real integration verifies login, ownership, normal-user admin denial, and admin access. |
| Properties and publication | ADEQUATE | Real integration and real Playwright verify public published visibility, hidden drafts, and admin draft visibility. |
| Saved properties | ADEQUATE | Real integration covers ownership; real Playwright covers anonymous campaign saves and authenticated saved-list state. |
| Interests and subscriber consent | ADEQUATE | Integration and real browser submission cover consent, normalized phone payloads, and campaign attribution. |
| Campaign attribution and statistics | ADEQUATE | Schema test, integration test, and real browser flow cover two deduplicated saves, one interest, daily totals, and non-campaign activity. |
| Unsubscribe | ADEQUATE | Integration and real browser test validate test-token consent revocation. |
| Email transport | ADEQUATE | Mocked Nodemailer tests cover SMTP environment configuration, port 2525, unsubscribe links, success, persistent failure, and campaign continuation. |
| Health, readiness, proxy, rate limiting | ADEQUATE | Unit tests exercise `/healthz`, success/failure `/readyz`, CORS, trusted proxy, and GraphQL limiter mounting; Docker verifies the live service. |
| Large GraphQL resolver module | WEAK | Critical paths have integration evidence, but much of the 2,000+ line resolver remains outside focused unit tests. |

## Frontend Coverage by Area

| Area | Classification | Evidence |
| --- | --- | --- |
| API client | ADEQUATE | Unit tests verify endpoint selection, authenticated and anonymous headers, GraphQL errors/session expiry, and HTTP 429 handling. |
| App context and saved properties | ADEQUATE | Unit tests cover anonymous and authenticated attribution-bearing saves and local persistence; real Playwright covers saved ownership. |
| Property cards | ADEQUATE | Component test verifies save/compare event isolation, details, price rendering, and navigation. |
| Subscriber admin | ADEQUATE | Component test covers list data, consent, digits-only input, country prefix composition, and mutation payload. |
| Campaign admin | ADEQUATE | Component tests cover saves/interests, daily zero values, GraphQL errors, campaign logs, and recipient failure display. |
| Other public and operational views | WEAK | Mocked journeys cover main public workflows, but many low-risk content, import, AI, and settings screens still lack direct component tests. |

## Playwright Journey Coverage

| Journey | Status |
| --- | --- |
| Public discovery, filters, detail, comparison, history, interest, saved state, mortgage, news, imports, and responsive search | PASS (12 mocked journeys) |
| Local Docker frontend + backend + PostgreSQL campaign attribution journey | PASS |
| Campaign click attribution, two saves, duplicate-save deduplication, non-campaign save exclusion, and one interest | PASS |
| Normal and admin authentication, admin denial, saved-property ownership | PASS |
| Published/draft property separation and published/draft/future news visibility | PASS |
| Campaign statistics daily saves/interests and safe unsubscribe | PASS |

## Remaining Gaps

- The large backend resolver and full admin import/AI workflows are still not broadly unit-tested; their production source remains included in coverage.
- Frontend global coverage remains below the 25% guideline because complete public layouts and many lower-risk administrative screens are included.
- The next highest-value additions are focused resolver tests for campaign preview/send authorization edges and UI tests for property import error/retry handling.

## Commands

Run from the indicated package directory:

```bash
# Code/backend
npm test
npm run test:coverage
npm run test:integration

# Code/frontend/my-react-app
npm run typecheck
npm test
npm run test:coverage
npm run lint
npm run build
npm run test:e2e
npm run test:e2e:real
```

`test:integration` requires `TEST_DATABASE_URL` for a dedicated database ending in `_test`. `test:e2e:real` provisions its own guarded local Docker stack and does not accept deployment URLs.

## Artifacts

- Backend HTML: `Code/backend/coverage/backend/index.html`
- Backend LCOV: `Code/backend/coverage/backend/lcov.info`
- Frontend HTML: `Code/frontend/my-react-app/coverage/frontend/index.html`
- Frontend LCOV: `Code/frontend/my-react-app/coverage/frontend/lcov.info`
- Playwright mocked HTML: `Code/frontend/my-react-app/playwright-report/index.html`
- Playwright real-stack HTML: `Code/frontend/my-react-app/playwright-report/real-stack/index.html`
