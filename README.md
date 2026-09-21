# Harborstone Homes (Ghome)

A full-stack property marketing and administration platform built as a coding challenge.

The application provides a public-facing property website alongside an administration platform for managing properties, content, subscribers and marketing activity.

## Project Overview

Harborstone Homes is designed around a fictional residential property development platform.

The project includes:

- Public property browsing
- Property search and filtering
- Property comparison
- Property details
- Mortgage calculator
- Saved properties
- Expressions of interest
- Subscriber consent management
- Property and engagement analytics
- News/content management
- Admin authentication
- Admin property management
- Subscriber management
- Email campaign management
- Campaign delivery tracking
- Property and historical-data imports
- GraphQL API
- PostgreSQL database
- Background email processing

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/978b6208-c051-4368-b425-b4882d3a9035" />

### Public user

A public user can:

- Browse available properties.
- Search and filter properties.
- Open detailed property pages.
- Compare properties.
- Calculate an estimated mortgage.
- Save properties.
- View saved properties.
- Submit an expression of interest.
- Provide data consent when submitting interest.
- Read property-related news.
- Use a property chatbot.
- Log in to access personalised functionality.

### Administrator

An administrator can:

- Sign in to the admin area.
- View dashboard summaries.
- Create, edit, publish, archive, or delete properties.
- Upload property data from CSV or Excel files.
- Manage photos, videos, floor plans, and features.
- Review AI home-tour generation jobs. (seeded video as of now )
- Manage subscribers.
- Import subscribers.
- Create and preview email campaigns.
- Send campaigns to consented subscribers.
- Review campaign delivery status.
- Manage expressions of interest.
- Send follow-up communication.
- Create and publish news posts.
- Link news posts to properties.
- Review analytics and campaign statistics.


```mermaid
flowchart TD
    Browser[User browser]
    Frontend[React TypeScript frontend\nVite + Tailwind + React Router]
    GraphQL[Express GraphQL backend]
    Prisma[Prisma client]
    PostgreSQL[(PostgreSQL)]
    EmailAPI[Independent email service API]
    EmailWorker[Independent background worker]
    SMTP[SMTP provider - Brevo]

    Browser --> Frontend
    Frontend --> GraphQL
    GraphQL --> Prisma
    Prisma --> PostgreSQL
    EmailAPI --> PostgreSQL
    EmailWorker --> PostgreSQL
    EmailWorker --> SMTP
```

# Running the Project Locally

## Prerequisites

Before running the project locally, make sure you have the following installed:

- Node.js
- npm
- PostgreSQL
- Git
- Docker (optional)

---

 # Running Locally
 
## Prerequisites
 
- Node.js
- npm
- PostgreSQL
## 1. Backend
 
```bash
cd backend
npm install
```
 
Create `backend/.env`:
 
```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME"
```
 
Then run:
 
```bash
npx prisma generate
npx prisma migrate deploy
npm run admin:bootstrap
npm run build
npm start
```
 
Backend:
 
```text
http://localhost:4000
```
 
GraphQL:
 
```text
http://localhost:4000/graphql
```
 
## 2. Frontend
 
Open a new terminal:
 
```bash
cd frontend/my-react-app
npm install
```
 
Create `frontend/my-react-app/.env`:
 
```env
VITE_GRAPHQL_URL="http://localhost:4000/graphql"
```
 
Start the frontend:
 
```bash
npm run dev
```
 
Open the URL shown by Vite.
 
## 3. Email Service
 
If testing email functionality:
 
```bash
cd email
npm install
```
 
Configure the required SMTP variables in `.env` and start the email service using its configured npm command.
 
## 4. Tests
 
### Backend
 
```bash
cd backend
npm test
```
 
### Frontend
 
```bash
cd frontend/my-react-app
npm run lint
npx tsc -b
npm run build
npx playwright test
```
 
## 5. Docker
 
### Backend
 
```bash
cd backend
docker build -t harborstone-backend .
docker run --name harborstone-backend-test -p 4000:4000 harborstone-backend
```
 
The backend container runs:
 
```text
Prisma migrations → Admin bootstrap → Backend server
```
 
The container requires a PostgreSQL database accessible through `DATABASE_URL`.
 
> Do not commit `.env` files or database/SMTP credentials to the repository.

## Production Deployment

The frontend is deployed to Vercel and the backend is deployed as a Render Docker service with Render PostgreSQL. Configure values through the platform environment managers; do not add production values to `.env` files or source control.

### Hosted URLs

- Public site: `https://ghome-alpha.vercel.app/`
- Administrator: `https://ghome-alpha.vercel.app/admin`
- GraphQL API: the deployed Render service URL, including `/graphql`

`PUBLIC_APP_URL` must equal the public-site URL, and `VITE_GRAPHQL_URL` must equal the GraphQL API URL.

### Render backend environment

Set `DATABASE_URL`, `PUBLIC_APP_URL`, `PUBLIC_BACKEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `NODE_ENV=production`.

Render supplies `PORT`. The backend listens on `0.0.0.0`, runs `prisma migrate deploy`, performs the idempotent admin bootstrap, and then starts the API. `PUBLIC_APP_URL` is the allowed browser origin and `PUBLIC_BACKEND_URL` is used for campaign and unsubscribe links.

### Vercel frontend environment

Set `VITE_GRAPHQL_URL` to the deployed backend GraphQL URL, including `/graphql`, before the Vercel build. Vite embeds this value at build time, so redeploy the frontend after it changes. `vercel.json` supplies the SPA rewrite required for direct route refreshes.

### Production environment reference

| Variable | Deployment | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Render backend | Render PostgreSQL connection string. |
| `PUBLIC_APP_URL` | Render backend | HTTPS Vercel origin allowed by CORS. |
| `PUBLIC_BACKEND_URL` | Render backend | HTTPS API origin for campaign and unsubscribe links. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Render backend | SMTP relay configuration. |
| `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Render backend | Sender identity for campaign email. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Render backend | Initial administrator bootstrap credentials. |
| `NODE_ENV=production` | Render backend | Enables production runtime validation. |
| `PORT` | Render backend | Supplied by Render; do not set a fixed value. |
| `VITE_GRAPHQL_URL` | Vercel frontend | Deployed GraphQL API URL, including `/graphql`. |

### Disposable production-like verification

`Code/backend/docker-compose.test.yml` creates an isolated `harborstone_test` PostgreSQL database and production-mode backend. It never uses the developer database. Run it from `Code/backend`:

```bash
docker compose -p harborstone_test_suite -f docker-compose.test.yml up --build -d
docker compose -p harborstone_test_suite -f docker-compose.test.yml down -v
```

## Bonus Features

- GitHub Actions runs backend validation, generation, build, unit tests, disposable PostgreSQL integration tests, frontend type checks, lint, tests, build, and mocked Playwright journeys for every push and pull request.
- Campaign delivery uses focused Vitest coverage with a mocked Nodemailer transport, covering consent filtering, success and failure persistence, unsubscribe links, and continued delivery after individual failures.
- Campaign attribution records click, save, interest, and unsubscribe events without unreliable email-open measurement.

Email-open tracking is intentionally not implemented because email clients can block, proxy, cache, or prefetch remote images. The legacy `OPENED` database enum value remains only for migration safety and has no active runtime use.

Background email queues, ISR/static generation, and direct image file uploads remain intentionally deferred enhancements.

### Delivered campaign email reference

A production delivery screenshot is not committed because it would expose recipient data. The delivery HTML, recipient personalization, unsubscribe link, and tracked campaign links are verified in [`Code/backend/src/server.test.ts`](Code/backend/src/server.test.ts); the disposable end-to-end stack verifies campaign attribution and unsubscribe behavior in [`Code/frontend/my-react-app/e2e-real/real-stack.spec.ts`](Code/frontend/my-react-app/e2e-real/real-stack.spec.ts).

### Disposable test administrator

The isolated end-to-end stack creates this non-production account only:

- Email: `admin@e2e.harborstone.test`
- Password: `e2e-admin-password`

Never deploy these credentials or use them for a real administrator.

## Automated Tests

```bash
# Code/backend
npm test
npm run test:coverage
# Set TEST_DATABASE_URL only to a dedicated database whose name ends in _test.
npm run test:integration

# Code/frontend/my-react-app
npm test
npm run test:coverage
npm run test:e2e
# Requires E2E_BASE_URL and E2E_GRAPHQL_URL for a disposable real stack.
npm run test:e2e:real
```

Coverage reports are written to `Code/backend/coverage/backend/` and `Code/frontend/my-react-app/coverage/frontend/`. Playwright writes an HTML report to `Code/frontend/my-react-app/playwright-report/`.
 


## Data Model Overview

- `User` and `Session` provide authenticated access; `SavedProperty` records a user's property saves.
- `Property` is the core listing, with media, features, price history, interests, and development relationships.
- `Subscriber`, `Consent`, and `UnsubscribeToken` support marketing consent and opt-out records.
- `Campaign`, `CampaignRecipient`, `DeliveryAttempt`, and `CampaignEvent` model campaign composition, delivery, and engagement metrics.
- `NewsArticle`, `CampaignTemplate`, `PageContent`, and related join models provide managed marketing content.

## Key Technology Decisions

### React + Vite

I used React with Vite for the frontend instead of moving the project to Next.js.

#### Why?

The project was already set up using React and Vite, so I decided to continue with the existing setup rather than spend time moving the application to another framework.

This allowed me to focus on building the actual features required for the project.

#### Trade-off

Using Vite means I don't get some of the features that Next.js provides, such as built-in server-side rendering and its built-in routing and data-fetching features.

For the current project, a React and Vite setup was enough for what I needed.

---

### GraphQL

I used GraphQL for communication between the frontend and backend instead of a traditional REST API.

#### Why?

The application has a lot of property information and different filters.

With GraphQL, the frontend can request exactly the data it needs instead of receiving a fixed response containing everything.

This also makes it easier to add or change the data returned by the API as the application grows.

#### Trade-off

GraphQL requires more setup than a simple REST API because the application needs a schema and resolvers.

For this project, I felt the flexibility was useful enough to justify the additional setup.

---

### PostgreSQL + Prisma

I used PostgreSQL as the database and Prisma to communicate with the database from the backend.

#### Why?

The application contains several types of related data, including:

- Properties
- Property history
- Users
- Subscribers
- Campaigns
- Campaign recipients
- Content

PostgreSQL is a good fit for this type of structured and related data.

Prisma also makes it easier to work with the database from TypeScript while providing type safety.

#### Trade-off

Using PostgreSQL and Prisma requires more setup than using a simple database such as SQLite.

It also means managing database configuration and migrations.

However, the extra setup makes sense for this project because the application has multiple related pieces of data.


# AI Usage

AI tools were used as a supporting development tool during the project, mainly for troubleshooting, discussing technical approaches and improving documentation.

The core product thinking and planning were done by me. I spent significant time identifying the application's use cases, deciding what functionality was needed, designing the database schema and relationships, and planning how the different parts of the system should work together.

I then used the use cases I had defined to create the frontend designs in Figma. The Figma designs were used as the basis for implementing the React frontend.

AI was mainly used when I needed a second perspective or help investigating a specific technical problem. Examples include:

- Debugging TypeScript and PostgreSQL issues
- Discussing different implementation approaches
- Getting help with smaller pieces of code when needed
- Reviewing parts of the GraphQL and database implementation
- Helping structure and improve the documentation


Testing and verification were still carried out against the actual application and database. AI feedback was used as an additional way to question and validate my implementation rather than as a replacement for my own testing.

I did not rely on AI to design the entire application or generate the project from scratch. The use cases, database schema, frontend requirements, application structure and overall technical decisions were developed by me.

AI suggestions were treated as suggestions and were tested against the actual application before being used.

The final decisions around the product requirements, use cases, database design, business logic and implemented features were made by me.

## What I Would Do Next

- Move campaign delivery and imports to durable background queues with retries and operational visibility.
- Add production monitoring, alerting, backup/restore exercises, and a staging deployment gate.
- Increase end-to-end coverage for streamed request limits and real email-provider behavior.
- Reduce the Vite bundle and consider server rendering only where it improves property discovery.


