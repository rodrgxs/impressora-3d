import NextAuth from "next-auth";
import { headers } from "next/headers";
import { resolveCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuthConfig } from "@/lib/auth/config";
import { createAuthRateLimit } from "@/lib/auth/rate-limit";
import { createAuthService } from "@/lib/auth/service";

export const authService = createAuthService(prisma, createAuthRateLimit(prisma));
export const { handlers, auth, signIn, signOut } = NextAuth(createAuthConfig(authService));

export async function getCurrentUser() {
  return resolveCurrentUser(await headers(), authService);
}
