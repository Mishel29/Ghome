# Harborstone Homes

A property marketing platform with:

- React + TypeScript frontend
- Express + GraphQL backend
- PostgreSQL database
- Prisma ORM
- Admin property and campaign management

## Project Structure

```text
Ghome/
├── Code/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── generated/
│   │   │   ├── import/
│   │   │   ├── lib/
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── prisma7.config.ts
│   │
│   └── frontend/
│       └── my-react-app/
│           ├── public/
│           ├── src/
│           ├── package.json
│           └── vite.config.ts
│
└── Notes/
    └── DB_Schema/
```

## Requirements

Install:

- Node.js 20 or newer
- npm
- PostgreSQL

Check your versions:

```bash
node --version
npm --version
psql --version
```

## Getting Started

Clone the repository:

```bash
git clone https://github.com/Mishel29/Ghome.git
cd Ghome
```

## Backend Setup

Install dependencies:

```bash
cd Code/backend
npm install
```

Create a `.env` file inside `Code/backend`:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/harborstone"
```

Replace:

- `USERNAME` with your PostgreSQL username
- `PASSWORD` with your PostgreSQL password
- `harborstone` with your database name

Generate the Prisma client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate deploy
```

Start the backend in development mode:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:4000
```

GraphQL endpoint:

```text
http://localhost:4000/graphql
```

Health check:

```text
http://localhost:4000/
```

```json
{
  "message": "Harborstone backend is running",
  "database": "connected"
}
```

## Frontend Setup

Open a second terminal:

```bash
cd Code/frontend/my-react-app
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

> The backend should be running before opening the frontend, because the frontend sends GraphQL requests to `http://localhost:4000/graphql`.

## Build Commands

Frontend:

```bash
cd Code/frontend/my-react-app
npm run build
```

Backend:

```bash
cd Code/backend
npm run build
```

Start backend (production):

```bash
cd Code/backend
npm start
```