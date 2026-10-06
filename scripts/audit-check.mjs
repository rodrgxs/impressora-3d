import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const run = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["audit", "--json"],
  { encoding: "utf8", shell: process.platform === "win32" },
);
let audit;
try {
  audit = JSON.parse(run.stdout);
} catch {
  console.error("Could not read npm audit results.");
  process.exit(1);
}
if (audit.error || !audit.metadata || ![0, 1].includes(run.status)) {
  console.error("Dependency audit unavailable.");
  process.exit(1);
}
const exceptions = JSON.parse(
  readFileSync(new URL("../docs/audit-exceptions.json", import.meta.url)),
);
const lock = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url)),
);
const advisories = new Map();
for (const entry of Object.values(audit.vulnerabilities)) {
  for (const via of entry.via) {
    if (typeof via !== "object") continue;
    const exception = exceptions.find(
      (item) => item.url === via.url && new Date(item.expires) > new Date(),
    );
    const developmentOnly = entry.nodes.every(
      (node) => lock.packages[node]?.dev === true,
    );
    const accepted = Boolean(
      exception && developmentOnly && entry.name === exception.package,
    );
    advisories.set(via.url, Boolean(advisories.get(via.url)) || !accepted);
    console.log(
      `${accepted ? "KNOWN DEVELOPMENT RISK" : "BLOCKED"}: ${entry.name}: ${via.title} (${via.url})`,
    );
  }
}
console.log("npm audit counts:", audit.metadata.vulnerabilities);
if ([...advisories.values()].some(Boolean)) process.exit(1);
