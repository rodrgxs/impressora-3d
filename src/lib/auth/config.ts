import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { AuthService } from "./service";
import { clientKey } from "./http";

export function createAuthConfig(service: AuthService): NextAuthConfig {
  return {
    pages: { signIn: "/login", error: "/login" },
    session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
    providers: [Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        // Returning null gives a single generic credentials error, including rate limiting.
        try {
          return await service.login(credentials, clientKey(request.headers));
        } catch {
          return null; // Fail closed, without logging Prisma errors/connection strings.
        }
      },
    })],
    callbacks: {
      async jwt({ token, user }) {
        if (user) token.sub = user.id;
        // Ignore client session updates. Re-read roles and existence from the database.
        if (!token.sub) return null;
        const current = await service.currentUser(token.sub);
        if (!current) return null;
        return { sub: current.id, name: current.name, email: current.email, role: current.role };
      },
      async session({ session, token }) {
        return { expires: session.expires, user: {
          id: token.sub!,
          name: typeof token.name === "string" ? token.name : null,
          email: typeof token.email === "string" ? token.email : "",
          role: token.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
        } };
      },
    },
    // Auth.js handles CSRF, HttpOnly/SameSite cookies and Secure cookies on HTTPS.
    logger: {
      error() { console.error("Authentication request failed."); },
      warn(code) { console.warn("Authentication configuration warning:", code); },
      debug() {},
    },
  };
}
