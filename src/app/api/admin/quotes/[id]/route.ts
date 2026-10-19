import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { createAdminPatch } from "@/lib/admin/handler";
export const runtime = "nodejs";
const patch = createAdminPatch(prisma, getCurrentUser);
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return patch(request, (await params).id);
}
