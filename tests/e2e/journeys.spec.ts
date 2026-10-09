import { test, expect, type Page } from "@playwright/test";

async function fillQuote(page: Page) {
  await page.locator('[name="name"]').fill("Ana Teste");
  await page.locator('[name="email"]').fill("ana@example.com");
  await page.locator('[name="phone"]').fill("11999999999");
  await page.locator('[name="category"]').selectOption("Automotivo");
  await page.locator('[name="part"]').fill("Moldura de painel");
  await page
    .locator('[name="detail"]')
    .fill("Preciso de uma moldura para um painel antigo.");
}

test("responsive pages do not overflow at supported widths", async ({
  page,
}) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/cadastro"]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  }
});

test("mobile menu supports Escape and focus return; skip link works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const button = page.locator(".menu-toggle");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("quote validation focuses the first invalid control without a request", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/quotes", (route) => {
    requests++;
    return route.fulfill({ status: 500, json: {} });
  });
  await page.goto("/#orcamento");
  await page.getByRole("button", { name: "Registrar meu orçamento" }).click();
  await expect(page.locator('[name="name"]')).toBeFocused();
  await expect(page.locator('[name="name"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#error-name")).toBeVisible();
  expect(requests).toBe(0);
});

test("quote retries retain idempotency key and confirmation contains the protocol", async ({
  page,
}) => {
  const keys: (string | undefined)[] = [];
  await page.route("**/api/quotes", (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    return route.fulfill(
      keys.length === 1
        ? { status: 503, json: { error: "Unavailable" } }
        : { status: 201, json: { id: "confirmed-request-123" } },
    );
  });
  await page.goto("/#orcamento");
  await fillQuote(page);
  await page.getByRole("button", { name: "Registrar meu orçamento" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator('[name="part"]')).toHaveValue("Moldura de painel");
  await page.getByRole("button", { name: "Registrar meu orçamento" }).click();
  await expect(
    page.getByText("Solicitação registrada com sucesso", { exact: true }),
  ).toBeVisible();
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(keys[1]).toBe(keys[0]);
  await expect(
    page.getByRole("textbox", { name: "Resumo da solicitação registrada" }),
  ).toHaveValue(/Identificador: confirmed-request-123/);
  await expect(
    page.getByRole("button", { name: "Registrar meu orçamento" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Iniciar outro orçamento" }).click();
  await expect(page.locator('[name="name"]')).toHaveValue("");
});

test("headers, hydration, filters and unauthenticated account redirect", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await page
    .getByRole("button", { name: "Outros nichos", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(errors).toEqual([]);
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/login$/);
});

test("real signup/login/owned quote/logout on isolated PostgreSQL", async ({
  page,
}) => {
  test.skip(
    process.env.DB_INTEGRATION_TEST !== "1",
    "Requires isolated PostgreSQL; public UI tests use explicit API stubs.",
  );
  const database = new URL(
    process.env.DATABASE_URL || "postgresql://invalid/invalid",
  );
  expect(["127.0.0.1", "localhost"]).toContain(database.hostname);
  expect(database.pathname).toBe("/peca_lab_test");
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/cadastro");
  await page.locator('[name="name"]').fill("Cliente E2E");
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill("E2E isolated password!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se o cadastro puder ser realizado",
  );
  await page.goto("/login");
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill("E2E isolated password!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await page.goto("/#orcamento");
  await fillQuote(page);
  await page.locator('[name="email"]').fill(email);
  await page.getByRole("button", { name: "Registrar meu orçamento" }).click();
  await expect(
    page.getByText("Solicitação registrada com sucesso", { exact: true }),
  ).toBeVisible();
  await page.goto("/conta");
  await expect(page.locator(".account-quotes")).toContainText(
    "Moldura de painel",
  );
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/login$/);
});
