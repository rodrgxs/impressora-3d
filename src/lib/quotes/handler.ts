import { NextResponse, type NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import type { PublicUser } from "@/lib/auth/service";
import { sameOrigin } from "@/lib/auth/http";
import { consumeQuoteRateLimit } from "@/lib/quote-rate-limit";
import { quoteRequestSchema } from "@/lib/quotes/validation";

const MAX_BODY_BYTES = 16 * 1024;

function jsonError(message: string, status: number, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  return NextResponse.json({ error: message }, {
    status,
    headers: responseHeaders,
  });
}

export function createQuoteHandler(db: Pick<PrismaClient, "quoteRequest">, currentUser: () => Promise<PublicUser | null>) {
  return async function POST(request: NextRequest) {
    if (request.headers.has("origin") && !sameOrigin(request)) {
      return jsonError("Solicitação não permitida.", 403);
    }
    const forwardedIps = request.headers.get("x-forwarded-for")?.split(",");
    const clientIp = request.headers.get("x-real-ip")?.trim()
      || forwardedIps?.[forwardedIps.length - 1]?.trim()
      || "unknown";
    const limit = consumeQuoteRateLimit(clientIp);

    if (!limit.allowed) {
      return jsonError("Muitas solicitações. Aguarde antes de tentar novamente.", 429, {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return jsonError("Envie os dados no formato esperado.", 400);
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonError("Os dados enviados excedem o limite permitido.", 400);
    }

    let payload: unknown;
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return jsonError("Os dados enviados excedem o limite permitido.", 400);
      }
      payload = JSON.parse(body);
    } catch {
      return jsonError("Não foi possível interpretar os dados enviados.", 400);
    }

    const parsed = quoteRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonError("Confira os campos e tente novamente.", 400);
    }

    try {
      const user = await currentUser();
      const quoteRequest = await db.quoteRequest.create({
        data: {
          userId: user?.id ?? null,
          customerName: parsed.data.name,
          customerEmail: parsed.data.email,
          customerPhone: parsed.data.phone,
          partName: parsed.data.part,
          application: parsed.data.application,
          description: `Categoria: ${parsed.data.category}\n\n${parsed.data.description}`,
          quantity: parsed.data.quantity,
        },
        select: { id: true },
      });

      return NextResponse.json({ id: quoteRequest.id }, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      console.error("Unable to create quote request.");
      return jsonError("Não foi possível registrar sua solicitação agora.", 500);
    }
  }
}
