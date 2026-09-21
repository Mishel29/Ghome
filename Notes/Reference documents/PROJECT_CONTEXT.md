# Project Context

## Purpose
Harborstone Homes (requirements call it Glenveagh Properties) is a property marketing platform with a public site, an admin CMS, consented marketing campaigns, property/news content, lead capture, and CSV imports.

## Repository
- `Code/backend`: Node.js/TypeScript API and Prisma schema.
- `Code/frontend/my-react-app`: React/Vite application.
- `Notes`: use cases, datasets, database notes, and the older `PROJECT_HANDOFF.md`.
- There is no root package/workspace manifest.

## Runtime
- Frontend: React 19, Vite 8, React Router 7, Tailwind 4, Recharts.
- Backend: Express 5, `graphql` + `graphql-http`, TypeScript.
- Persistence: PostgreSQL through Prisma 7 with `@prisma/adapter-pg`.
- API entry: `Code/backend/src/server.ts`, port 4000, GraphQL at `/graphql`.
- Client GraphQL transport: hand-written fetch calls in `src/api/graphql.ts`; default endpoint is `http://localhost:4000/graphql`.
- Authentication: random bearer session tokens, SHA-256 token hashes in `Session`, eight-hour expiry, `sessionStorage` key `harborstone-token`.
- Email: Nodemailer with configured SMTP values; campaign sends are synchronous per recipient.

## Frontend
Public routes: home, login, properties/detail, mortgage, comparison, saved properties, analytics, news, chatbot.

Admin routes are protected by `RequireAdmin`: dashboard, properties/forms/import, campaigns, subscribers/import, templates, interests, news, and users.

`AppProvider` owns session restoration, public property/news loading, anonymous saved-property IDs in local storage, authenticated saved-property synchronization, and comparison selection. The client uses view models from `src/data.ts` alongside API types in `src/api/schemaTypes.ts`.

## Backend and GraphQL
`server.ts` deliberately contains SDL, resolver map, serializers, authorization helpers, CSV validation/import, SMTP send logic, and Express routes. There is no service/repository layer.

Public operations include property listing/detail, property view analytics, interest submission, news listing/detail, and login. Authenticated user operations include `me`, saved-property queries/mutations, and logout. Admin operations include property CRUD/publishing, imports, users, subscribers, templates, campaigns, interest follow-ups, dashboard/stats, and news management.

## Property Lifecycle
- Properties default to `publicationStatus: DRAFT`.
- Public property queries filter `publicationStatus: PUBLISHED` in the backend.
- Admin property queries can see all records.
- Admin `publishProperty` and `publishProperties` set publication and timestamp.
- Sales `status` and public `publicationStatus` are distinct; neither `DRAFT` nor `OFFLINE` sales state grants public visibility.
- Media uses `PropertyMedia`; imported `Image URL` becomes primary `IMAGE`, while `Video URL` becomes primary `VIDEO`. YouTube URLs render as a privacy-enhanced embed; direct URLs use a native video element.

## Prisma Domains
- Identity: `User`, `Session`, `AuditLog`.
- Property: `Property`, `PropertyMedia`, `Feature`, `PropertyFeature`, `PropertyValueHistory`, `SavedProperty`.
- Leads/consent: `Interest`, `InterestFollowUp`, `Consent`, `Subscriber`.
- Marketing: `Campaign`, `CampaignProperty`, `CampaignRecipient`, `CampaignEvent`, `CampaignTemplate`, `TemplateProperty`, `DeliveryAttempt`, `UnsubscribeToken`.
- Editorial/analytics: `NewsArticle`, `NewsProperty`, `AnalyticsEvent`, `Development`, `PageContent`, `PageMedia`.
- Reserved/inactive AI/RAG: `RagDocument`, `RagChunk`, `AiJob`, `AiJobAttempt`.
- Imports: `PropertyImportUpload`, `ImportJob`, `ImportChunk`, `ImportRowError`.

Important constraints: unique property source key/slug, history year per property, saved-property user/property pair, campaign/subscriber recipient pair, email addresses, session token hash, and event deduplication keys.

## Historical Prices
CSV rows provide `Years` and `Historical Prices` JSON arrays. Validation requires paired arrays, ascending years, positive values, and a first year matching completion year when supplied. The latest historical value must match current price within 0.05. Persisted history is normalized to `PropertyValueHistory(year, value)` with a unique property/year constraint; frontend growth charts consume this normalized structure.

## CSV Imports
Property imports are admin-only and synchronous:
1. Upload CSV content to `PropertyImportUpload`.
2. Validate headers, required values, historical prices, URLs, and duplicates.
3. Review errors/warnings and resolve database-name collisions as `SKIP` or `REPLACE`.
4. Start import, which writes properties and history within transactions.

New and replaced records are forced to drafts. Name comparisons normalize case and whitespace. Duplicate names inside the file block import; database duplicates require an explicit resolution. Empty spreadsheet spacer columns are accepted as diagnostics, preventing sparse-header JSON errors.

The UI shows job-like progress, but no active BullMQ queue creates batches or workers. `ImportJob` is persisted for status/history; chunk records are currently unused by the live import path.

## Campaigns and Attribution
Campaigns select published properties and active consented subscribers. Sending creates recipient and delivery-attempt records. A draft-only send guard prevents repeated sends. Campaign HTML appends an unsubscribe link, property links redirect through `/campaign-click`, and external template links are similarly tracked. Events are stored in `CampaignEvent` for sent, failed, clicked, interest, save, and unsubscribe actions. Statistics are aggregated by campaign/day. Save attribution is deduplicated per recipient/property; interest attribution requires the form email to match the tracked recipient.

## Subscribers and Interests
Subscribers are distinct from users. Marketing eligibility requires `ACTIVE` status and `consentGrantedAt`. Unsubscribe updates subscriber status and records an event when a campaign token is present. Interest capture requires public property visibility and consent, creates/updates a subscriber, persists consent, and creates an `Interest` record.

## RAG, AI, Redis, and BullMQ
The database schema and dependencies contain RAG, AI job, MCP, Dashscope, Redis, and BullMQ-related concepts, but the active runtime source has no queue, worker, Redis client, MCP client, Dashscope client, or vector-store integration. The chatbot uses the implemented `propertyAssistant` path; it is not a verified RAG pipeline. AI home-tour client UI was removed because no matching resolver was active.

## Migrations
- `20260917095114_init`: prototype property model.
- `20260917144502_platform_schema`: platform schema replacement.
- `20260918120000_property_history_index`: history index.
- `20260918150000_news_external_url`: news URL migration.

Use `schema.prisma` and applied migrations as database sources of truth; generated Prisma code in `src/generated` is not edited manually.

## Tests and Commands
Run commands from the owning directory.

Backend (`Code/backend`): `npm run build`, `npm test`, `npm start`.
Frontend (`Code/frontend/my-react-app`): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

Verified during this audit: backend build and 11 tests pass; frontend typecheck, lint, 5 tests, and build pass. Vite reports a non-blocking large chunk warning. Playwright uses mocked GraphQL routes and does not validate real database, SMTP, Redis, or import workflows.

## Environment Variable Names
- Database: `DATABASE_URL`.
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.
- Mail sender: `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`.
- Application URLs: `PUBLIC_APP_URL`, `PUBLIC_BACKEND_URL`, optional `VITE_GRAPHQL_URL`.
- Redis is not documented in `.env.example` and has no active runtime consumer.

## Critical Invariants
- Draft properties must never be publicly readable.
- Only admins may manage properties, users, imports, campaigns, subscribers, templates, interests, and news.
- Saved-property records belong only to their authenticated user; anonymous saves remain browser-local.
- Campaign recipients must be active and explicitly consented.
- Unsubscribed recipients must be excluded from campaigns.
- Historical year/value pairs must remain aligned.
- CSV duplicates must be resolved or corrected before import.
- Imported/replaced properties must remain drafts until an admin publishes them.
- Every campaign event must be scoped to a valid recipient/campaign token.

## Current Risks
- GraphQL SDL, resolver code, frontend query strings, and `schemaTypes.ts` are separate hand-maintained contracts and can drift.
- The older `Notes/PROJECT_HANDOFF.md` conflicts with current source in several campaign/import assertions and is outdated.
- BullMQ/Redis, RAG, and AI home-tour schemas/dependencies create expectations not met by active runtime code.
- The synchronous importer and campaign sender are not appropriate for large-scale production workloads.
- There are no real database/SMTP/import integration tests or active queue tests.
