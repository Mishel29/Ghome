# Alignment Audit

Audit date: 2026-09-18. Repository state is authoritative; no application source, schema, migration, package, or environment configuration was changed for this audit.

## User and Auth
- Prisma: `User.role` supports `USER`, `ADMIN`, and `AGENT`; `Session` stores token hash and expiry.
- Backend: `login` uses scrypt password verification; `requireUser` checks session expiry; `requireAdmin` enforces `ADMIN` server-side.
- Frontend: bearer token in session storage; `RequireAdmin` protects admin routes.
- Alignment: admin authorization is enforced server-side. Frontend `AppUser` collapses `AGENT` to `user`, which is acceptable only while agents have no separate UI.
- Risk: GraphQL errors are plain errors rather than a stable typed error contract.

## Property
- Prisma: `Property` stores sales status and publication status independently, numeric price/size ranges, media, features, value history, relations to interest, campaigns, news, saves, analytics, RAG, and AI.
- Backend: public resolvers filter `publicationStatus: PUBLISHED`; admin resolvers access all states. Manual saves force draft; admin can publish singly or in bulk.
- Frontend: API `Property` is mapped to a view-model shape with price and square-foot ranges; public cards/details/analytics/compare consume that view model.
- CSV: first 16 fields required; optional historical-price, image URL, and video URL columns. New/replaced imports are drafts.
- Alignment issues: `PropertyStatus.DRAFT` overlaps semantically with `PublicationStatus.DRAFT`; publication status is the authoritative visibility rule. Property output metrics are computed separately from stored `AnalyticsEvent`/`CampaignEvent` data and need contract checks whenever expanded.

## Historical Prices
- Prisma: `PropertyValueHistory` has unique `(propertyId, year)` and decimal values.
- Backend/CSV: validates JSON arrays, ascending years, completion year pairing, positive numbers, and current-price tolerance.
- Frontend: maps normalized records to chart values using `historyGrowth`.
- Tests: dedicated historical-price tests pass.
- Alignment: normalized persistence prevents parallel-array drift. CSV validation is stricter than manual property input and must remain deliberately so or be consolidated later.

## Saved Properties
- Prisma: unique `(userId, propertyId)`, cascades from user/property.
- Backend: authenticated saves use upsert/delete; public anonymous saves use browser local storage.
- Frontend: context merges local and authenticated state.
- Alignment: anonymous and authenticated behavior intentionally differ. Verify any future account migration behavior explicitly.

## Interests and Consent
- Prisma: `Interest` links a property, optional user/agent, consent, and follow-ups; `Consent` can target user, interest, or subscriber.
- Backend: public interest requires consent and a published property, creates a subscriber/consent/interest; campaign-token attribution requires recipient email match.
- Frontend: property detail submits `InterestInput`, including campaign token from URL.
- Risk: consent rows use restrictive relationships, so administrative deletes require dependent consent cleanup.

## Subscribers
- Prisma: unique email, status, consent timestamps, campaign events/recipients, unsubscribe tokens.
- Backend: marketing campaigns select `ACTIVE` subscribers with `consentGrantedAt`; unsubscribe changes status and records attributed event when possible.
- Frontend: admin paging/export/import; separate from `User` identity.
- Alignment: subscriber CSV import uses different validation and lifecycle rules from property CSV import.

## Campaigns
- Prisma: campaign/template/property/recipient/event/delivery-attempt relations. Event types include sent, failed, clicked, interest, saved, and unsubscribed.
- Backend: admin-only CRUD/send; sends synchronously; draft guard prevents re-send; event recording drives per-campaign and daily statistics.
- Frontend: campaign log queries metrics; statistics display campaign subject and date; templates select published properties.
- Tests: focused mocked browser campaign journey exists; no real SMTP/database campaign integration test.
- Risks: send is synchronous and lacks a durable queue/retry worker. Link tracking is server-side, but email provider delivery/open webhooks are not implemented.

## News
- Prisma: `NewsArticle` with publication/active period and property links.
- Backend: admin CRUD/publish, public resolver filters published and active dates, records news visits.
- Frontend: public and admin views use GraphQL queries.
- Alignment: `externalUrl` migration exists and is reflected in schema. Continue checking public field selection when adding editorial fields.

## Imports
- Prisma: upload, job, chunk, and row-error models.
- Backend: property import is synchronous despite job/chunk fields. Validation persists results and normalized raw rows. Duplicate names inside the file block import; database name collisions require SKIP or REPLACE and replacements become drafts.
- Frontend: upload/review/progress UI displays batch terminology, but active backend does not create `ImportChunk` rows.
- Tests: CSV headers and historical-price tests pass; sparse blank header regression is covered.
- Alignment issues: UI/database imply asynchronous queues; runtime has none. There is no unique DB constraint on normalized property name, so concurrent imports can still race.

## RAG and AI Home Tours
- Prisma/dependencies: RAG documents/chunks and AI job/review/media associations exist; `@modelcontextprotocol/sdk` and BullMQ are installed.
- Backend runtime: no verified MCP, Dashscope, queue, worker, embedding, external vector, or AI-job resolver exists in `src/server.ts`.
- Frontend: chatbot calls `propertyAssistant`; no active AI home-tour component remains.
- Alignment issue: requirements promise RAG, MCP/Dashscope home tours, review, retries, and background processing, but active runtime does not implement them. Treat models and dependencies as reserved/inactive, not functioning features.

## GraphQL Contracts
- GraphQL is defined as a SDL string and resolver object in `server.ts`.
- Frontend uses string queries and separately maintained `schemaTypes.ts`.
- Alignment risk: no generated operation client or schema validation makes stale fields/types possible. The previous handoff says frontend operations are ahead of source, but current source should be inspected each time because that document is outdated.
- Classification: public property/news/interest/view endpoints; authenticated `me`, saved-property, logout; admin management and import/campaign endpoints.

## Tests and Verification
- Backend: Node test runner, 11 passing tests for historical prices, CSV headers, and subscriber statistics.
- Frontend: Vitest, 5 passing tests; Playwright journeys mock all GraphQL traffic.
- Audit verification: backend build/tests pass; frontend typecheck/lint/tests/build pass.
- Gap: no integration tests for Prisma, SMTP, actual campaign links, imports, Redis, BullMQ, RAG, or AI.

## Migrations and Deployment
- Current migrations: initial prototype, platform schema, property-history index, and news external URL.
- Prisma generated code is committed under `src/generated`; do not edit it manually.
- No Dockerfile or Compose configuration was found.
- `.env.example` documents database, SMTP, sender, and public URL variables; no Redis/AI/MCP configuration contract is documented.

## Priority Findings
### High
- Import and campaign processing are synchronous despite large-scale queue requirements and persisted queue-shaped data models.
- RAG/AI/MCP/BullMQ requirements are not represented by active runtime code.
- Hand-maintained GraphQL client queries/types can drift from the single backend SDL.

### Medium
- `PROJECT_HANDOFF.md` is stale relative to current campaign/import implementation.
- Property-name duplicate detection lacks a database uniqueness constraint and therefore cannot eliminate concurrent-import races.
- No real integration tests cover high-risk persistence and email flows.

### Low
- Frontend production build has a large JavaScript chunk warning.
- Legacy/repository fixture data remains in `src/data.ts` for view-model/UI use and must not be mistaken for persisted application data.

## Change Impact Checklist
- Property schema: Prisma migration -> generated client -> backend SDL/resolvers/imports -> frontend API types/forms/cards/analytics/compare -> tests.
- Import workflow: CSV columns/header validation -> persisted validation JSON -> duplicate decision UI -> import transaction -> job/history UI -> tests.
- Campaign workflow: recipients/consent -> templates/link rendering -> SMTP -> recipient/delivery records -> campaign events -> statistics UI -> tests.
- Auth changes: session storage -> GraphQL request header -> resolver guards -> route guards -> saved property/administrative ownership checks.
- RAG/AI/queue work: configuration -> client/worker lifecycle -> persisted job status -> public visibility checks -> frontend state -> integration tests.
