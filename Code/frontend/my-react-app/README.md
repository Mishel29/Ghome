# Harborstone frontend

See the [project README](../../../README.md) for feature usage, administrator login and backend/worker setup.

From this directory run `npm ci` and `npm run dev -- --host 127.0.0.1`. Open http://127.0.0.1:5173. The default GraphQL endpoint is http://localhost:4000/graphql; set `VITE_GRAPHQL_URL` in a local `.env` to override it.

Validation: `npm run lint`, `npx tsc -b`, `npm run build`. Current coverage and outstanding checks are recorded in the project traceability document. Real API/data are required for integrated features; local mock data is not a substitute for starting the backend.
