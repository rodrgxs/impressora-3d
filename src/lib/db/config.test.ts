import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfigFromFile } from "@prisma/config";

test("patched Prisma config merger loads plain configuration without changing schema path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "peca-prisma-config-"));
  try {
    await writeFile(
      join(directory, "prisma.config.mjs"),
      'export default { schema: "prisma/schema.prisma" };',
    );
    const result = await loadConfigFromFile({ configRoot: directory });
    assert.equal(result.error, undefined);
    assert.equal(result.config.schema, join(directory, "prisma/schema.prisma"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
