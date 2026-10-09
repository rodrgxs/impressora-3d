import assert from "node:assert/strict";
import test from "node:test";
import { quoteRequestSchema } from "./validation";

const validQuote = {
  name: "  Ana Silva ",
  email: " ANA@EXAMPLE.COM ",
  phone: "(11) 99999-9999",
  category: "Automotivo",
  part: "Moldura do painel",
  application: "Fusca 1974",
  quantity: 2,
  description: "Preciso refazer uma moldura com encaixe para o painel.",
};

test("accepts valid data and normalizes visitor input", () => {
  const result = quoteRequestSchema.safeParse(validQuote);

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, "Ana Silva");
  assert.equal(result.data.email, "ana@example.com");
  assert.equal(result.data.phone, "11999999999");
  assert.equal(result.data.quantity, 2);
});

test("rejects invalid email addresses", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...validQuote, email: "invalido" }).success, false);
});

test("rejects zero, negative, fractional, and non-numeric quantities", () => {
  for (const quantity of [0, -5, 1.5, "2"]) {
    assert.equal(quoteRequestSchema.safeParse({ ...validQuote, quantity }).success, false);
  }
});

test("rejects missing required fields", () => {
  const missingName = Object.fromEntries(
    Object.entries(validQuote).filter(([field]) => field !== "name"),
  );
  assert.equal(quoteRequestSchema.safeParse(missingName).success, false);
});

test("rejects fields not defined by the request contract", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...validQuote, userId: "arbitrary-user" }).success, false);
});

test("accepts an omitted application and normalizes an empty value to null", () => {
  const withoutApplication = Object.fromEntries(
    Object.entries(validQuote).filter(([field]) => field !== "application"),
  );
  const omitted = quoteRequestSchema.safeParse(withoutApplication);
  const empty = quoteRequestSchema.safeParse({ ...validQuote, application: "  " });

  assert.equal(omitted.success, true);
  assert.equal(empty.success, true);
  if (omitted.success) assert.equal(omitted.data.application, null);
  if (empty.success) assert.equal(empty.data.application, null);
});
