export type RuntimeEnvironment = Record<string, string | undefined>;

const LOCAL_APP_URL = "http://localhost:5173";
const LOCAL_BACKEND_URL = "http://localhost:4000";

function configuredUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || undefined;
}

function localLoopbackAliases(url: string) {
  const parsed = new URL(url);
  if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return [url];
  parsed.hostname = parsed.hostname === "localhost" ? "127.0.0.1" : "localhost";
  return [url, parsed.toString().replace(/\/+$/, "")];
}

export function publicAppUrl(env: RuntimeEnvironment = process.env) {
  const value = configuredUrl(env.PUBLIC_APP_URL);
  if (value) return value;
  if (env.NODE_ENV === "production") throw new Error("PUBLIC_APP_URL must be configured in production");
  return LOCAL_APP_URL;
}

export function publicBackendUrl(env: RuntimeEnvironment = process.env) {
  const value = configuredUrl(env.PUBLIC_BACKEND_URL);
  if (value) return value;
  if (env.NODE_ENV === "production") throw new Error("PUBLIC_BACKEND_URL must be configured in production");
  return LOCAL_BACKEND_URL;
}

export function allowedCorsOrigins(env: RuntimeEnvironment = process.env) {
  const configured = configuredUrl(env.PUBLIC_APP_URL);
  if (configured) return new Set(env.NODE_ENV === "production" ? [configured] : localLoopbackAliases(configured));
  if (env.NODE_ENV === "production") return new Set<string>();
  return new Set([LOCAL_APP_URL, "http://127.0.0.1:5173"]);
}

export function isAllowedCorsOrigin(origin: string | undefined, env: RuntimeEnvironment = process.env) {
  return !origin || allowedCorsOrigins(env).has(origin);
}

export function assertProductionRuntimeConfiguration(env: RuntimeEnvironment = process.env) {
  if (env.NODE_ENV !== "production") return;
  const required = [
    "DATABASE_URL",
    "PUBLIC_APP_URL",
    "PUBLIC_BACKEND_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "MAIL_FROM_EMAIL",
    "MAIL_FROM_NAME",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  const backendUrl = configuredUrl(env.PUBLIC_BACKEND_URL);
  try {
    const parsed = new URL(backendUrl!);
    if (parsed.protocol !== "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1") throw new Error("not publicly reachable");
  } catch {
    throw new Error("PUBLIC_BACKEND_URL must be a publicly reachable HTTPS URL in production");
  }
}
