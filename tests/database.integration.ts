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

test("admin updates use fresh roles, atomic audit history and optimistic concurrency", async () => {
  const { updateQuoteStatus, listAdminQuotes, adminQuote } = await import(
    "../src/lib/admin/quotes"
  );
  const db = new PrismaClient();
  const admin = await db.user.create({
    data: {
      name: "CI Admin",
      email: `admin-${crypto.randomUUID()}@example.com`,
      role: "ADMIN",
    },
    select: { id: true, name: true, email: true, role: true },
  });
  const customer = await db.user.create({
    data: {
      name: "CI Customer",
      email: `customer-${crypto.randomUUID()}@example.com`,
      role: "CUSTOMER",
    },
    select: { id: true, name: true, email: true, role: true },
  });
  const quote = await db.quoteRequest.create({
    data: {
      userId: customer.id,
      customerName: "CI Customer",
      customerEmail: customer.email!,
      customerPhone: "11999999999",
      partName: `CI-${crypto.randomUUID()}`,
      description: "Isolated administration test",
    },
  });
  const change = {
    status: "UNDER_REVIEW",
    expectedUpdatedAt: quote.updatedAt.toISOString(),
    note: "Review started",
  };
  try {
    await assert.rejects(listAdminQuotes(db, customer, {}), { status: 403 });
    await assert.rejects(adminQuote(db, customer, quote.id), { status: 403 });
    await assert.rejects(updateQuoteStatus(db, customer, quote.id, change), {
      status: 403,
    });
    await assert.rejects(
      updateQuoteStatus(db, admin, quote.id, { ...change, status: "ACCEPTED" }),
      { status: 400 },
    );
    const race = await Promise.allSettled([
      updateQuoteStatus(db, admin, quote.id, change),
      updateQuoteStatus(db, admin, quote.id, change),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      (race.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason.status,
      409,
    );
    const detail = await adminQuote(db, admin, quote.id);
    assert.equal(detail?.status, "UNDER_REVIEW");
    assert.equal(detail?.statusHistory.length, 1);
    assert.equal(detail?.statusHistory[0].actor?.name, "CI Admin");
    assert.equal(
      (
        await listAdminQuotes(db, admin, {
          q: quote.partName,
          status: "UNDER_REVIEW",
        })
      ).total,
      1,
    );
    assert.ok(!("submissionHash" in detail!));
    assert.equal((await accountQuotes(db, customer))[0].status, "UNDER_REVIEW");
    await db.user.update({
      where: { id: admin.id },
      data: { role: "CUSTOMER" },
    });
    await assert.rejects(
      updateQuoteStatus(db, admin, quote.id, {
        ...change,
        status: "CANCELLED",
        expectedUpdatedAt: detail!.updatedAt.toISOString(),
      }),
      { status: 403 },
    );
    assert.equal(
      await db.statusHistory.count({ where: { quoteRequestId: quote.id } }),
      1,
    );
  } finally {
    await db.quoteRequest.delete({ where: { id: quote.id } });
    await db.user.deleteMany({
      where: { id: { in: [admin.id, customer.id] } },
    });
    await db.$disconnect();
  }
});
