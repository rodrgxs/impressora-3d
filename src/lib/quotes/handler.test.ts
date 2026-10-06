import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { createQuoteHandler } from "./handler";
import { readSmallJson, clientKey } from "../auth/http";

function request(body: BodyInit, headers: Record<string, string> = {}) {
  return new NextRequest("https://peca.test/api/quotes", {
    method: "POST",
    headers: {
      origin: "https://peca.test",
      "content-type": "application/json",
      ...headers,
    },
    body,
    duplex: "half",
  } as never);
}
const payload = {
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "11999999999",
  category: "Automotivo",
  part: "Moldura",
  description: "Uma moldura para painel",
  quantity: 1,
};

test("bounded JSON reader cancels oversized chunked bodies before consuming the stream", async () => {
  let reads = 0,
    cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      reads++;
      if (reads <= 100) controller.enqueue(new Uint8Array(1024).fill(32));
      else controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    readSmallJson(request(body), 16 * 1024),
    /Body too large/,
  );
  assert.equal(cancelled, true);
  assert.ok(reads < 20, `Consumed ${reads} chunks`);
});

test("JSON parser enforces MIME, actual UTF-8 byte size and invalid JSON", async () => {
  await assert.rejects(
    readSmallJson(
      request("{}", { "content-type": "application/json-malicious" }),
    ),
  );
  await assert.rejects(
    readSmallJson(request("{}", { "content-length": "20000" }), 16384),
  );
  await assert.rejects(
    readSmallJson(
      request(JSON.stringify({ data: "é".repeat(3000) }), {
        "content-length": "10",
      }),
    ),
  );
  await assert.rejects(readSmallJson(request("{")));
  assert.deepEqual(
    await readSmallJson(
      request("{}", { "content-type": "application/json; charset=utf-8" }),
    ),
    {},
  );
});

test("quotes require same origin and fail closed on limiter outage without writing", async () => {
  let writes = 0;
  const db = {
    quoteRequest: {
      create: async () => {
        writes++;
        return { id: "test" };
      },
    },
  } as never;
  const handler = createQuoteHandler(
    db,
    async () => null,
    async () => {
      throw Error("private database details");
    },
  );
  for (const origin of ["https://other.test", "null", ""])
    assert.equal((await handler(request("{}", { origin }))).status, 403);
  const missing = request("{}");
  missing.headers.delete("origin");
  assert.equal((await handler(missing)).status, 403);
  const response = await handler(request(JSON.stringify(payload)));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("private"));
  assert.equal(writes, 0);
});

test("quotes preserve 400, 429 and 500 contracts without leaking submitted secrets", async () => {
  const db = {
    quoteRequest: {
      create: async () => {
        throw Error("private connection string");
      },
    },
  } as never;
  const allowed = createQuoteHandler(
    db,
    async () => null,
    async () => true,
  );
  for (const body of [
    { ...payload, userId: "victim" },
    { ...payload, quantity: 0 },
    { ...payload, email: "bad" },
    { ...payload, role: "ADMIN" },
  ]) {
    assert.equal((await allowed(request(JSON.stringify(body)))).status, 400);
  }
  const invalid = await allowed(
    request(JSON.stringify({ ...payload, phone: "letters" })),
  );
  assert.equal(
    (await invalid.json()).fields.phone,
    "Informe um telefone com 8 a 15 dígitos, incluindo o DDD.",
  );
  const limited = await createQuoteHandler(
    db,
    async () => null,
    async () => false,
  )(request(JSON.stringify(payload)));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
  const failed = await allowed(request(JSON.stringify(payload)));
  assert.equal(failed.status, 500);
  assert.ok(!(await failed.text()).includes("private"));
});

test("trusted client header accepts only one canonical IP", () => {
  const old = process.env.AUTH_CLIENT_IP_HEADER;
  try {
    delete process.env.AUTH_CLIENT_IP_HEADER;
    assert.equal(
      clientKey(new Headers({ "x-real-ip": "192.0.2.1" })),
      "unknown",
    );
    process.env.AUTH_CLIENT_IP_HEADER = "x-real-ip";
    assert.equal(
      clientKey(new Headers({ "x-real-ip": "192.0.2.1" })),
      "192.0.2.1",
    );
    assert.equal(
      clientKey(new Headers({ "x-real-ip": "192.0.2.1, 192.0.2.2" })),
      "unknown",
    );
    assert.equal(
      clientKey(new Headers({ "x-real-ip": "arbitrary-bucket" })),
      "unknown",
    );
    assert.equal(
      clientKey(new Headers({ "x-real-ip": "2001:0db8::1" })),
      clientKey(new Headers({ "x-real-ip": "2001:db8::1" })),
    );
  } finally {
    if (old === undefined) delete process.env.AUTH_CLIENT_IP_HEADER;
    else process.env.AUTH_CLIENT_IP_HEADER = old;
  }
});
