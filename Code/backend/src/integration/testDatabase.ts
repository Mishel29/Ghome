export function requireTestDatabaseUrl(value = process.env.TEST_DATABASE_URL) {
  if (!value) throw new Error("TEST_DATABASE_URL is required for database integration tests");
  const url = new URL(value);
  const databaseName = url.pathname.replace(/^\//, "").toLowerCase();
  const host = url.hostname.toLowerCase();
  if (!databaseName.endsWith("_test") || /render|production|prod/.test(host) || /render|production|prod/.test(databaseName)) {
    throw new Error("TEST_DATABASE_URL must target a dedicated *_test database and must not reference production infrastructure");
  }
  return value;
}
