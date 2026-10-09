// Reports variable names only. Never prints values, URLs, secrets or database errors.
const missing = [];
for (const name of [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "AUTH_CLIENT_IP_HEADER",
]) {
  if (!process.env[name]) missing.push(name);
}
if (
  (process.env.AUTH_SECRET?.length ?? 0) < 32 &&
  !missing.includes("AUTH_SECRET")
)
  missing.push("AUTH_SECRET (minimum 32 characters)");
for (const name of ["AUTH_URL", "NEXT_PUBLIC_SITE_URL"]) {
  try {
    if (new URL(process.env[name]).protocol !== "https:")
      missing.push(`${name} (HTTPS required)`);
  } catch {
    if (!missing.includes(name)) missing.push(name);
  }
}
if (process.env.AUTH_URL && process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    if (
      new URL(process.env.AUTH_URL).origin !==
      new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    )
      missing.push("AUTH_URL/NEXT_PUBLIC_SITE_URL (origins must match)");
  } catch {}
}
if (missing.length) {
  console.error("Deployment configuration incomplete:", missing.join(", "));
  process.exit(1);
}
console.log(
  "Required configuration present. Still verify proxy header overwrite, migrations, backups, business/privacy details and browser journeys before production.",
);
