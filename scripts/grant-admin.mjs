// Operator-only command. No HTTP endpoint can grant administrator privileges.
import { PrismaClient } from "@prisma/client";
const { ADMIN_USER_ID, ADMIN_CONFIRM_USER_ID, ADMIN_DATABASE_HOST, DATABASE_URL } = process.env;
let target;
try { target = new URL(DATABASE_URL); } catch {}
if (!ADMIN_USER_ID || ADMIN_CONFIRM_USER_ID !== ADMIN_USER_ID || !target || ADMIN_DATABASE_HOST !== target.hostname) {
  console.error("Require ADMIN_USER_ID, matching ADMIN_CONFIRM_USER_ID, and ADMIN_DATABASE_HOST matching the intended database. No change made.");
  process.exit(1);
}
const db = new PrismaClient();
try {
  const user = await db.user.findUnique({ where: { id: ADMIN_USER_ID }, select: { id: true, passwordHash: true } });
  if (!user?.passwordHash) throw new Error("Existing password account required");
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" }, select: { id: true } });
  console.log("Administrator access granted to the explicitly selected account. No credentials changed.");
} catch {
  console.error("Unable to grant access. Check the selected account and database privately.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }
