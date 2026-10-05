import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { PrismaClient } from "@prisma/client";
import { Auth } from "@auth/core";
import { NextRequest } from "next/server";
import { createAuthConfig } from "./config";
import { createAuthService, hasRole, type PublicUser } from "./service";
import { createAuthRateLimit } from "./rate-limit";
import { createRegisterHandler } from "./register-handler";
import { accountQuotes } from "./account";
import { clientKey } from "./http";
import { resolveCurrentUser } from "./current-user";
import { hashPassword, verifyPassword } from "./password";
import { createQuoteHandler } from "../quotes/handler";

// Actual PostgreSQL-compatible engine, isolated in memory. Never connects to Neon.
const pg = new PGlite();
const oldSecret = process.env.AUTH_SECRET;
const oldURL = process.env.AUTH_URL;
const oldIPHeader = process.env.AUTH_CLIENT_IP_HEADER;
const testSecret = randomBytes(48).toString("hex");
const signup = { name: "Ana Silva", email: " ANA@EXAMPLE.COM ", password: "Uma frase exclusiva 2026!" };

function select(row: Record<string, unknown>, fields: Record<string, boolean>) {
  return Object.fromEntries(Object.keys(fields).filter(key => fields[key]).map(key => [key, row[key]]));
}
// Thin Prisma boundary: application services and handlers run unchanged against real tables.
const db = {
  user: {
    async create({ data }: { data: { name: string; email: string; passwordHash: string; role: string } }) {
      try {
        const result = await pg.query('INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id', [crypto.randomUUID(), data.name, data.email, data.passwordHash, data.role]);
        return result.rows[0];
      } catch (error) {
        if (typeof error === "object" && error && "code" in error && error.code === "23505") throw { code: "P2002" };
        throw error;
      }
    },
    async findUnique({ where, select: fields }: { where: { id?: string; email?: string }; select: Record<string, boolean> }) {
      const result = await pg.query<Record<string, unknown>>(`SELECT * FROM "User" WHERE ${where.id ? 'id' : 'email'} = $1`, [where.id || where.email]);
      return result.rows[0] ? select(result.rows[0], fields) : null;
    },
  },
  async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
    const sql = strings.reduce((text, chunk, index) => text + (index ? `$${index}` : "") + chunk, "");
    return (await pg.query(sql, values)).rows;
  },
  authRateLimit: {
    async deleteMany({ where }: { where: { expiresAt: { lt: Date } } }) {
      await pg.query('DELETE FROM "AuthRateLimit" WHERE "expiresAt" < $1', [where.expiresAt.lt]);
    },
  },
  quoteRequest: {
    async create({ data }: { data: Record<string, unknown> }) {
      const id = crypto.randomUUID();
      await pg.query('INSERT INTO "QuoteRequest" (id,"userId","customerName","customerEmail","customerPhone","partName",application,description,quantity,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())', [id, data.userId, data.customerName, data.customerEmail, data.customerPhone, data.partName, data.application, data.description, data.quantity]);
      return { id };
    },
    async findMany({ where }: { where: { userId: string } }) {
      return (await pg.query('SELECT id,"partName",status,"createdAt" FROM "QuoteRequest" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50', [where.userId])).rows;
    },
  },
} as unknown as PrismaClient;
const service = createAuthService(db, createAuthRateLimit(db));
const registration = createRegisterHandler(service);

before(async () => {
  process.env.AUTH_SECRET = testSecret;
  delete process.env.AUTH_URL;
  delete process.env.AUTH_CLIENT_IP_HEADER;
  for (const path of [
    "20261003190000_init", "20261003191700_data_integrity_and_payment_idempotency", "20261005140000_customer_auth",
  ]) {
    if (path === "20261005140000_customer_auth") {
      await pg.query('INSERT INTO "User" (id,email,"updatedAt") VALUES ($1,$2,NOW())', ["before-auth", "existing@example.com"]);
    }
    await pg.exec(await readFile(`prisma/migrations/${path}/migration.sql`, "utf8"));
  }
});
after(async () => {
  for (const [key, value] of Object.entries({ AUTH_SECRET: oldSecret, AUTH_URL: oldURL, AUTH_CLIENT_IP_HEADER: oldIPHeader })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await pg.close();
});
function registrationRequest(payload: unknown, origin = "https://peca.test") {
  return new Request("https://peca.test/api/auth/register", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload) });
}

test("new migration preserves existing models and adds nullable password plus shared limiter", async () => {
  const result = await pg.query('SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name=\'User\' AND column_name=\'passwordHash\'');
  assert.equal(result.rows.length, 1);
  assert.equal((result.rows[0] as { is_nullable: string }).is_nullable, "YES");
  const previous = await pg.query<{ email: string; passwordHash: string | null }>('SELECT email,"passwordHash" FROM "User" WHERE id=$1', ["before-auth"]);
  assert.equal(previous.rows[0].email, "existing@example.com");
  assert.equal(previous.rows[0].passwordHash, null);
});

test("registration persists normalized CUSTOMER with safe hash, duplicates return identical response", async () => {
  const first = await registration(registrationRequest(signup));
  const duplicate = await registration(registrationRequest(signup));
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, first.status);
  assert.equal(await duplicate.text(), await first.text());
  const user = (await pg.query<{ passwordHash: string; role: string; name: string }>('SELECT * FROM "User" WHERE email=$1', ["ana@example.com"])).rows[0];
  assert.equal(user.name, "Ana Silva");
  assert.equal(user.role, "CUSTOMER");
  assert.notEqual(user.passwordHash, signup.password);
  assert.equal(await verifyPassword(signup.password, user.passwordHash), true);
});

test("registration validates on server and rejects role/id injection, weak/oversized passwords", async () => {
  const unlimited = createRegisterHandler(createAuthService(db, async () => true));
  for (const payload of [
    { ...signup, role: "ADMIN" }, { ...signup, userId: "victim" },
    { ...signup, email: "invalid" }, { ...signup, password: "short" },
    { ...signup, password: "x".repeat(129) }, { ...signup, name: "" },
  ]) assert.equal((await unlimited(registrationRequest(payload))).status, 400);
});

test("registration rejects cross-origin/missing-origin, malformed and oversized bodies", async () => {
  assert.equal((await registration(registrationRequest(signup, "https://attacker.test"))).status, 403);
  const missing = registrationRequest(signup); missing.headers.delete("origin");
  assert.equal((await registration(missing)).status, 403);
  const malformed = new Request("https://peca.test/api/auth/register", { method: "POST", headers: { origin: "https://peca.test", "content-type": "application/json" }, body: "{" });
  assert.equal((await registration(malformed)).status, 400);
  assert.equal((await registration(registrationRequest({ ...signup, name: "x".repeat(5000) }))).status, 400);
});

test("login normalizes e-mail and returns public fields only; invalid/unknown/passwordless fail identically", async () => {
  const user = await service.login(signup, "login-valid");
  assert.ok(user);
  assert.equal(user.email, "ana@example.com");
  assert.equal(user.role, "CUSTOMER");
  assert.deepEqual(Object.keys(user).sort(), ["email", "id", "name", "role"]);
  assert.equal(await service.login({ ...signup, password: "Incorrect password!" }, "login-wrong"), null);
  assert.equal(await service.login({ ...signup, email: "unknown@example.com" }, "login-unknown"), null);
  await pg.query('INSERT INTO "User" (id,email,"updatedAt") VALUES ($1,$2,NOW())', ["legacy-user", "legacy@example.com"]);
  assert.equal(await service.login({ ...signup, email: "legacy@example.com" }, "login-legacy"), null);
});

test("hashes have random salts, preserve whitespace and do not accept malformed hashes", async () => {
  const password = "  a long phrase with spaces  ";
  const first = await hashPassword(password);
  assert.notEqual(first, await hashPassword(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password.trim(), first), false);
  assert.equal(await verifyPassword(password, "broken"), false);
});

test("shared SQL limiter handles concurrent attempts, saturation and window expiry across instances", async () => {
  const one = createAuthRateLimit(db), two = createAuthRateLimit(db);
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? one : two)("test", "same-client", 5)));
  assert.equal(results.filter(Boolean).length, 5);
  await pg.query('UPDATE "AuthRateLimit" SET "expiresAt"=NOW()-INTERVAL \'1 minute\' WHERE "key" LIKE \'test:%\'');
  assert.equal(await two("test", "same-client", 5), true);
  const rows = (await pg.query<{ key: string; count: number }>('SELECT * FROM "AuthRateLimit"')).rows;
  assert.ok(rows.every(row => !row.key.includes("ana@example.com") && !row.key.includes("same-client")));
});

test("login enforces per-account and per-IP limits even on successful attempts", async () => {
  const account = { ...signup, email: "limited-account@example.com" };
  await service.register(account, "limited-account-signup");
  for (let i = 0; i < 10; i++) assert.ok(await service.login(account, `login-account-${i}`));
  assert.equal(await service.login(account, "login-new-ip"), null);
  const limiter = createAuthRateLimit(db);
  for (let i = 0; i < 20; i++) assert.equal(await limiter("login-ip", "blocked-ip", 20), true);
  assert.equal(await service.login(signup, "blocked-ip"), null);
});

test("registration limit returns 429 and fails closed when storage is unavailable", async () => {
  const limited = createRegisterHandler(createAuthService(db, async () => false));
  const response = await limited(registrationRequest(signup));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "900");
  const broken = createRegisterHandler(createAuthService(db, async () => { throw new Error("private connection details"); }));
  const failed = await broken(registrationRequest(signup));
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private"));
});

test("client cannot spoof IP headers unless ingress trust is explicitly configured", () => {
  assert.equal(clientKey(new Headers({ "x-real-ip": "fake", "x-forwarded-for": "fake" })), "unknown");
});

// Exercise Auth.js itself (real CSRF, JWE cookies, expiry, callbacks, logout).
class AuthBrowser {
  cookies = new Map<string, string>();
  config = {
    ...createAuthConfig(createAuthService(db, async () => true)),
    basePath: "/api/auth", trustHost: true, secret: testSecret,
  };
  async request(path: string, body?: URLSearchParams) {
    const response = await Auth(new Request(`https://peca.test/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      headers: { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...(body ? { "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" } : {}) },
      body,
    }), this.config);
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";"); const index = pair.indexOf("=");
      const key = pair.slice(0, index), value = pair.slice(index + 1);
      if (value) this.cookies.set(key, value); else this.cookies.delete(key);
    }
    return response;
  }
  async login(password = signup.password, email = signup.email) {
    const { csrfToken } = await (await this.request("csrf")).json();
    return this.request("callback/credentials", new URLSearchParams({ csrfToken, email, password, callbackUrl: "https://peca.test/conta" }));
  }
  async session() { return (await this.request("session")).json(); }
}

test("Auth.js creates secure session; hides password; refreshes roles; ignores browser updates; logs out", async () => {
  const browser = new AuthBrowser();
  assert.equal(await browser.session(), null);
  const login = await browser.login();
  assert.equal((await login.json()).url, "https://peca.test/conta");
  const cookies = login.headers.getSetCookie().join(";");
  assert.match(cookies, /HttpOnly/i); assert.match(cookies, /Secure/i); assert.match(cookies, /SameSite=Lax/i);
  let session = await browser.session();
  assert.equal(session.user.email, "ana@example.com");
  assert.equal(session.user.role, "CUSTOMER");
  assert.ok(!JSON.stringify(session).includes("password"));
  assert.ok(new Date(session.expires).getTime() <= Date.now() + 8 * 3600000 + 5000);
  const userId = session.user.id;
  const { csrfToken } = await (await browser.request("csrf")).json();
  await browser.request("session", new URLSearchParams({ csrfToken, data: JSON.stringify({ user: { id: "victim", role: "ADMIN" } }) }));
  session = await browser.session();
  assert.equal(session.user.id, userId); assert.equal(session.user.role, "CUSTOMER");
  await pg.query('UPDATE "User" SET role=\'ADMIN\' WHERE id=$1', [userId]);
  assert.equal((await browser.session()).user.role, "ADMIN");
  await pg.query('UPDATE "User" SET role=\'CUSTOMER\' WHERE id=$1', [userId]);
  const csrf = await (await browser.request("csrf")).json();
  await browser.request("signout", new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "https://peca.test/login" }));
  assert.equal(await browser.session(), null);
});

test("Auth.js blocks login without CSRF and gives same response for wrong/unknown credentials", async () => {
  const browser = new AuthBrowser();
  const noCSRF = await browser.request("callback/credentials", new URLSearchParams({ email: signup.email, password: signup.password }));
  assert.match((await noCSRF.json()).url, /MissingCSRF/);
  assert.equal(await browser.session(), null);
  const wrong = await browser.login("Wrong phrase for login!");
  const unknown = await browser.login(signup.password, "missing@example.com");
  assert.equal((await wrong.json()).url, (await unknown.json()).url);
});

test("tampered/expired cookies and deleted accounts cannot authorize a session", async () => {
  const browser = new AuthBrowser(); await browser.login();
  const key = [...browser.cookies.keys()].find(key => key.includes("session-token"))!;
  browser.cookies.set(key, browser.cookies.get(key)!.slice(0, -5) + "xxxxx");
  assert.equal(await browser.session(), null);
  const expired = new AuthBrowser(); expired.config.session = { strategy: "jwt", maxAge: -60 };
  await expired.login(); assert.equal(await expired.session(), null);
  const removed = new AuthBrowser();
  await service.register({ ...signup, email: "deleted@example.com" }, "deleted-user");
  await removed.login(signup.password, "deleted@example.com");
  await pg.query('DELETE FROM "User" WHERE email=$1', ["deleted@example.com"]);
  assert.equal(await removed.session(), null);
});

const quote = { name: "Ana Silva", email: "visitor@example.com", phone: "11999999999", category: "Automotivo", part: "Moldura", description: "Moldura para painel antigo", quantity: 1 };
function quoteRequest(payload: unknown) {
  return new NextRequest("https://peca.test/api/quotes", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": crypto.randomUUID() }, body: JSON.stringify(payload) });
}

test("QuoteRequest integration uses server session id, preserves visitor null and isolates account queries", async () => {
  const browser = new AuthBrowser(); await browser.login();
  const user = (await browser.session()).user as PublicUser;
  const requestHeaders = new Headers({ cookie: [...browser.cookies].map(([key, value]) => `${key}=${value}`).join("; ") });
  const loggedIn = createQuoteHandler(db, async () => resolveCurrentUser(requestHeaders, service, true));
  const visitor = createQuoteHandler(db, async () => null);
  const owned = await loggedIn(quoteRequest(quote));
  const anonymous = await visitor(quoteRequest(quote));
  assert.equal(owned.status, 201); assert.equal(anonymous.status, 201);
  const rows = (await pg.query<{ userId: string | null }>('SELECT "userId" FROM "QuoteRequest"')).rows;
  assert.equal(rows[0].userId, user.id); assert.equal(rows[1].userId, null);
  assert.equal((await loggedIn(quoteRequest({ ...quote, userId: "victim" }))).status, 400);
  assert.equal((await visitor(quoteRequest({ ...quote, userId: user.id }))).status, 400);
  assert.equal((await accountQuotes(db, user)).length, 1);
  assert.equal((await accountQuotes(db, { ...user, id: "legacy-user" })).length, 0);
  await assert.rejects(accountQuotes(db, null), /Unauthenticated/);
  assert.equal(hasRole(user, "ADMIN"), false);
  assert.equal(hasRole(null, "ADMIN"), false);
  assert.equal(hasRole({ ...user, role: "ADMIN" }, "ADMIN"), true);
});

test("QuoteRequest fails closed on session lookup failure and rejects cross-origin", async () => {
  const broken = createQuoteHandler(db, async () => { throw new Error("private"); });
  const response = await broken(quoteRequest(quote));
  assert.equal(response.status, 500); assert.ok(!(await response.text()).includes("private"));
  const request = quoteRequest(quote); request.headers.set("origin", "https://attacker.test");
  assert.equal((await createQuoteHandler(db, async () => null)(request)).status, 403);
});


test("server identity rejects invalid tokens and propagates DB failure instead of treating customer as visitor", async () => {
  const browser = new AuthBrowser(); await browser.login();
  const headers = new Headers({ cookie: [...browser.cookies].map(([key, value]) => `${key}=${value}`).join("; ") });
  const user = await resolveCurrentUser(headers, service, true);
  assert.equal(user?.email, "ana@example.com");
  assert.equal(await resolveCurrentUser(new Headers(), service, true), null);
  assert.equal(await resolveCurrentUser(new Headers({ cookie: "__Secure-authjs.session-token=forged" }), service, true), null);
  const broken = { ...service, currentUser: async () => { throw new Error("Database unavailable"); } };
  await assert.rejects(resolveCurrentUser(headers, broken, true), /Database unavailable/);
  const handler = createQuoteHandler(db, () => resolveCurrentUser(headers, broken, true));
  assert.equal((await handler(quoteRequest(quote))).status, 500);
});
