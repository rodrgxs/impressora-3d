import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import type { PublicUser } from "../auth/service";
import { readSmallJson, sameOrigin } from "../auth/http";
import { createAuthRateLimit, type ConsumeLimit } from "../auth/rate-limit";
import { AdminError, requireAdmin, updateQuoteStatus } from "./quotes";
const json = (data: object, status: number) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export function createAdminPatch(
  db: PrismaClient,
  currentUser: () => Promise<PublicUser | null>,
  consume: ConsumeLimit = createAuthRateLimit(db),
) {
  return async (request: Request, id: string) => {
    try {
      if (!sameOrigin(request))
        return json({ error: "Solicitação não permitida." }, 403);
      const user = await currentUser();
      const admin = await requireAdmin(db, user);
      if (!(await consume("admin-write", admin.id, 60)))
        return json(
          { error: "Muitas alterações. Aguarde e tente novamente." },
          429,
        );
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id))
        return json({ error: "Solicitação não encontrada." }, 404);
      let payload: unknown;
      try {
        payload = await readSmallJson(request);
      } catch {
        return json({ error: "Envie JSON válido com até 4 KB." }, 400);
      }
      return json(await updateQuoteStatus(db, user, id, payload), 200);
    } catch (error) {
      if (error instanceof AdminError)
        return json({ error: error.message }, error.status);
      console.error("Administrative quote update unavailable.");
      return json({ error: "Não foi possível salvar a alteração agora." }, 503);
    }
  };
}
