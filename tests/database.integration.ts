import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { createAuthRateLimit } from "../src/lib/auth/rate-limit";
import { createAuthService } from "../src/lib/auth/service";
import { createQuoteHandler } from "../src/lib/quotes/handler";
import { accountQuotes } from "../src/lib/auth/account";

// Fail before any connection unless this is the explicitly isolated local test database.
const url = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
if (
  process.env.DB_INTEGRATION_TEST !== "1" ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/peca_lab_test"
) {
  throw new Error(
    "Integration test requires DB_INTEGRATION_TEST=1 and local database peca_lab_test. Never run against Neon/production.",
  );
}
process.env.AUTH_SECRET = randomBytes(48).toString("hex");
process.env.AUTH_URL = "https://peca.test";
delete process.env.AUTH_CLIENT_IP_HEADER;

test("real Prisma/PostgreSQL: registration, login, shared rate limit, ownership and idempotency", async () => {
  const db = new PrismaClient();
  const email = `integration-${crypto.randomUUID()}@example.com`;
  try {
    const consume = createAuthRateLimit(db);
    const service = createAuthService(db, consume);
    const signup = {
      name: "Integration Test",
      email,
      password: "Integration test password!",
    };
    assert.equal(await service.register(signup, email), "accepted");
    const user = await service.login(signup, email);
    assert.ok(user);
    assert.equal(user.role, "CUSTOMER");
    const key = crypto.randomUUID();
    const payload = {
      name: signup.name,
      email,
      phone: "11999999999",
      category: "Automotivo",
      part: "Moldura",
      quantity: 1,
      description: "Teste isolado de persistência",
    };
    const req = () =>
      new NextRequest("https://peca.test/api/quotes", {
        method: "POST",
        headers: {
          origin: "https://peca.test",
          "content-type": "application/json",
          "idempotency-key": key,
        },
        body: JSON.stringify(payload),
      });
    const handler = createQuoteHandler(db, async () => user);
    const responses = await Promise.all([handler(req()), handler(req())]);
    assert.deepEqual(
      responses.map((r) => r.status),
      [201, 201],
    );
    const one = await responses[0].json();
    assert.deepEqual(one, await responses[1].json());
    assert.equal((await accountQuotes(db, user)).length, 1);
    assert.equal(
      (await accountQuotes(db, { ...user, id: "another-customer" })).length,
      0,
    );
    assert.equal(
      (await db.quoteRequest.findUniqueOrThrow({ where: { id: one.id } }))
        .status,
      "RECEIVED",
    );
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () => consume("it-ip", email, 3)),
    );
    assert.equal(attempts.filter(Boolean).length, 3);
  } finally {
    await db.quoteRequest.deleteMany({ where: { customerEmail: email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
