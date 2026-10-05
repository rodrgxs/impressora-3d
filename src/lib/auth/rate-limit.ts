import { createHmac } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type ConsumeLimit = (scope: string, key: string, maximum: number) => Promise<boolean>;
const WINDOW_MS = 15 * 60 * 1000;

export function createAuthRateLimit(db: Pick<PrismaClient, "$queryRaw" | "authRateLimit">): ConsumeLimit {
  return async (scope, identifier, maximum) => {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error("Auth secret is not configured");
    const key = `${scope}:${createHmac("sha256", secret).update(identifier).digest("hex")}`;
    // One atomic UPSERT prevents concurrent requests/instances from bypassing the counter.
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt")
      VALUES (${key}, 1, NOW() + ${WINDOW_MS} * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN 1
                       ELSE LEAST("AuthRateLimit"."count" + 1, ${maximum + 1}) END,
        "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW()
                           THEN NOW() + ${WINDOW_MS} * INTERVAL '1 millisecond'
                           ELSE "AuthRateLimit"."expiresAt" END
      RETURNING "count"
    `;
    await db.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
    return rows[0].count <= maximum;
  };
}
