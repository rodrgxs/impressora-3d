import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminPatch } from "./handler";
import { requireAdmin } from "./quotes";
import type { PublicUser } from "../auth/service";
const user: PublicUser = {
  id: "admin",
  role: "ADMIN",
  name: "Admin",
  email: "admin@example.com",
};
const req = (origin = "https://peca.test", body = "{}") =>
  new Request("https://peca.test/api/admin/quotes/test", {
    method: "PATCH",
    headers: { origin, "content-type": "application/json" },
    body,
  });

test("admin writes reject foreign origin before session or database access", async () => {
  let calls = 0;
  const handler = createAdminPatch(
    {} as never,
    async () => {
      calls++;
      return user;
    },
    async () => true,
  );
  assert.equal((await handler(req("https://evil.test"), "test")).status, 403);
  assert.equal(calls, 0);
});
test("anonymous and customer identities cannot reach admin mutation", async () => {
  let writes = 0;
  const db = {
    user: { findUnique: async () => ({ id: "customer", role: "CUSTOMER" }) },
    $transaction: () => {
      writes++;
    },
  } as never;
  assert.equal(
    (
      await createAdminPatch(
        db,
        async () => null,
        async () => true,
      )(req(), "test")
    ).status,
    401,
  );
  // Even an ADMIN claim in the supplied identity cannot override the current database role.
  assert.equal(
    (
      await createAdminPatch(
        db,
        async () => user,
        async () => true,
      )(req(), "test")
    ).status,
    403,
  );
  assert.equal(writes, 0);
});
test("revoked or deleted administrator is denied by the service guard", async () => {
  for (const current of [null, { id: user.id, role: "CUSTOMER" }]) {
    await assert.rejects(
      requireAdmin(
        { user: { findUnique: async () => current } } as never,
        user,
      ),
      { status: 403 },
    );
  }
});
test("admin handler limits writes and hides backend failures", async () => {
  const db = {
    user: { findUnique: async () => ({ id: "admin", role: "ADMIN" }) },
  } as never;
  const limited = await createAdminPatch(
    db,
    async () => user,
    async () => false,
  )(req(), "test");
  assert.equal(limited.status, 429);
  const failed = await createAdminPatch(
    db,
    async () => {
      throw Error("private connection URL");
    },
    async () => true,
  )(req(), "test");
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("cache-control"), "no-store");
  assert.ok(!(await failed.text()).includes("private"));
});
test("admin handler rejects malformed and oversized payloads and forged actor", async () => {
  const db = {
    user: { findUnique: async () => ({ id: "admin", role: "ADMIN" }) },
  } as never;
  const handler = createAdminPatch(
    db,
    async () => user,
    async () => true,
  );
  for (const body of [
    "{",
    "x".repeat(5000),
    JSON.stringify({
      status: "UNDER_REVIEW",
      expectedUpdatedAt: new Date().toISOString(),
      note: "Analyze",
      actorUserId: "another",
    }),
  ]) {
    assert.equal(
      (await handler(req("https://peca.test", body), "test")).status,
      400,
    );
  }
});
