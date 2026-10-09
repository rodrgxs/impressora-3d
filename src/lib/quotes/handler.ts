import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import type { PublicUser } from "@/lib/auth/service";
import { clientKey, readSmallJson, sameOrigin } from "@/lib/auth/http";
import { createAuthRateLimit, type ConsumeLimit } from "@/lib/auth/rate-limit";
import { quoteFieldErrors, quoteRequestSchema } from "./validation";

type QuoteDB = Pick<
  PrismaClient,
  "quoteRequest" | "$queryRaw" | "authRateLimit"
>;
function error(
  message: string,
  status: number,
  extra: object = {},
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error: message, ...extra },
    {
      status,
      headers: { "Cache-Control": "no-store", ...headers },
    },
  );
}
const success = (id: string) =>
  NextResponse.json(
    { id },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );

export function createQuoteHandler(
  db: QuoteDB,
  currentUser: () => Promise<PublicUser | null>,
  consume: ConsumeLimit = createAuthRateLimit(db),
) {
  return async function POST(request: NextRequest) {
    if (!sameOrigin(request)) return error("Solicitação não permitida.", 403);
    try {
      if (!(await consume("quote-ip", clientKey(request.headers), 5))) {
        return error(
          "Muitas solicitações. Aguarde antes de tentar novamente.",
          429,
          {},
          { "Retry-After": "900" },
        );
      }
    } catch {
      console.error("Quote rate limit unavailable.");
      return error("Não foi possível registrar sua solicitação agora.", 503);
    }
    let payload: unknown;
    try {
      payload = await readSmallJson(request, 16 * 1024);
    } catch {
      return error("Envie dados válidos com até 16 KB.", 400);
    }
    const parsed = quoteRequestSchema.safeParse(payload);
    if (!parsed.success)
      return error("Confira os campos e tente novamente.", 400, {
        fields: quoteFieldErrors(parsed.error.issues),
      });

    const key = request.headers.get("idempotency-key");
    if (
      key !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    ) {
      return error("Identificador de envio inválido. Atualize a página.", 400);
    }
    try {
      const user = await currentUser();
      const submissionKey = key
        ? createHash("sha256").update(key.toLowerCase()).digest("hex")
        : null;
      // The fingerprint includes the server identity: a retry cannot change ownership or content.
      const submissionHash = submissionKey
        ? createHash("sha256")
            .update(
              JSON.stringify({ userId: user?.id ?? null, ...parsed.data }),
            )
            .digest("hex")
        : null;
      try {
        const quote = await db.quoteRequest.create({
          data: {
            userId: user?.id ?? null,
            customerName: parsed.data.name,
            customerEmail: parsed.data.email,
            customerPhone: parsed.data.phone,
            partName: parsed.data.part,
            application: parsed.data.application,
            description: `Categoria: ${parsed.data.category}\n\n${parsed.data.description}`,
            quantity: parsed.data.quantity,
            status: "RECEIVED",
            submissionKey,
            submissionHash,
          },
          select: { id: true },
        });
        return success(quote.id);
      } catch (cause) {
        if (
          !submissionKey ||
          typeof cause !== "object" ||
          cause === null ||
          !("code" in cause) ||
          cause.code !== "P2002"
        )
          throw cause;
        const existing = await db.quoteRequest.findUnique({
          where: { submissionKey },
          select: { id: true, submissionHash: true },
        });
        if (!existing) throw cause;
        if (existing.submissionHash !== submissionHash)
          return error(
            "Este envio já foi utilizado para outra solicitação. Inicie um novo orçamento.",
            409,
          );
        return success(existing.id);
      }
    } catch {
      console.error("Unable to create quote request.");
      return error("Não foi possível registrar sua solicitação agora.", 500);
    }
  };
}
