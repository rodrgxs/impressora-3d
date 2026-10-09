import { getToken } from "next-auth/jwt";
import type { AuthService } from "./service";

export async function resolveCurrentUser(headers: Headers, service: AuthService, secureCookies =
  process.env.AUTH_URL ? new URL(process.env.AUTH_URL).protocol === "https:" : process.env.NODE_ENV === "production") {
  const cookieName = `${secureCookies ? "__Secure-" : ""}authjs.session-token`;
  const cookie = headers.get("cookie") || "";
  if (!cookie.split(";").some(part => part.trim().startsWith(`${cookieName}=`) || part.trim().startsWith(`${cookieName}.`))) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Auth secret is not configured");
  // Auth.js verifies/decrypts its own JWE, including expiry. Do not use auth() here:
  // it catches callback/database errors and returns null, which would lose quote ownership.
  const token = await getToken({ req: { headers }, secret, cookieName, salt: cookieName });
  if (!token?.sub) return null;
  // A database failure propagates to the caller. Browser token roles are never authoritative.
  return service.currentUser(token.sub);
}
