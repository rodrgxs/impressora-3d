import { z } from "zod";
import type { PrismaClient, QuoteStatus } from "@prisma/client";
import type { PublicUser } from "../auth/service";

export const statusLabels: Record<QuoteStatus, string> = {
  RECEIVED: "Recebido",
  UNDER_REVIEW: "Em análise",
  NEEDS_INFORMATION: "Aguardando informações",
  PROPOSAL_SENT: "Proposta enviada",
  ACCEPTED: "Aceito",
  REJECTED: "Recusado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};
// Commercial acceptance/proposal states belong to their future workflows.
export const transitions: Record<QuoteStatus, readonly QuoteStatus[]> = {
  RECEIVED: ["UNDER_REVIEW", "NEEDS_INFORMATION", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "REJECTED", "CANCELLED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  PROPOSAL_SENT: [],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireAdmin(
  db: Pick<PrismaClient, "user">,
  user: PublicUser | null,
) {
  if (!user) throw new AdminError(401, "Entre na sua conta para continuar.");
  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (fresh?.role !== "ADMIN")
    throw new AdminError(403, "Acesso restrito à administração.");
  return fresh;
}
const listSelect = {
  id: true,
  partName: true,
  customerName: true,
  status: true,
  quantity: true,
  createdAt: true,
} as const;
export async function listAdminQuotes(
  db: PrismaClient,
  user: PublicUser | null,
  input: { q?: string; status?: string; page?: string },
) {
  await requireAdmin(db, user);
  const q = (input.q || "").trim().slice(0, 100);
  const status = Object.hasOwn(statusLabels, input.status || "")
    ? (input.status as QuoteStatus)
    : undefined;
  const page = Math.min(
    10000,
    Math.max(
      1,
      Number.isSafeInteger(Number(input.page)) ? Number(input.page) : 1,
    ),
  );
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { id: { equals: q } },
            { partName: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await db.$transaction([
    db.quoteRequest.findMany({
      where,
      select: listSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 25,
      take: 25,
    }),
    db.quoteRequest.count({ where }),
  ]);
  return { rows, total, page, q, status };
}
export async function adminQuote(
  db: PrismaClient,
  user: PublicUser | null,
  id: string,
) {
  await requireAdmin(db, user);
  return db.quoteRequest.findUnique({
    where: { id },
    select: {
      ...listSelect,
      customerEmail: true,
      customerPhone: true,
      application: true,
      description: true,
      updatedAt: true,
      statusHistory: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
    },
  });
}
export const updateSchema = z.strictObject({
  status: z.enum([
    "UNDER_REVIEW",
    "NEEDS_INFORMATION",
    "REJECTED",
    "CANCELLED",
  ]),
  expectedUpdatedAt: z.iso.datetime(),
  note: z.string().trim().min(3).max(1000),
});
export async function updateQuoteStatus(
  db: PrismaClient,
  user: PublicUser | null,
  id: string,
  payload: unknown,
) {
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success)
    throw new AdminError(
      400,
      "Confira o andamento e informe uma observação de 3 a 1.000 caracteres.",
    );
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const admin = await requireAdmin(tx, user);
    const current = await tx.quoteRequest.findUnique({
      where: { id },
      select: { status: true, updatedAt: true },
    });
    if (!current) throw new AdminError(404, "Solicitação não encontrada.");
    if (current.updatedAt.toISOString() !== input.expectedUpdatedAt)
      throw new AdminError(
        409,
        "Esta solicitação mudou. Atualize a página antes de continuar.",
      );
    if (!transitions[current.status].includes(input.status))
      throw new AdminError(
        409,
        "Essa mudança de andamento não está disponível.",
      );
    const changed = await tx.quoteRequest.updateMany({
      where: { id, status: current.status, updatedAt: current.updatedAt },
      data: {
        status: input.status,
        updatedAt: new Date(
          Math.max(Date.now(), current.updatedAt.getTime() + 1),
        ),
      },
    });
    if (changed.count !== 1)
      throw new AdminError(
        409,
        "Outra pessoa alterou esta solicitação. Atualize a página.",
      );
    await tx.statusHistory.create({
      data: {
        quoteRequestId: id,
        actorUserId: admin.id,
        fromStatus: current.status,
        toStatus: input.status,
        note: input.note,
      },
    });
    return { status: input.status };
  });
}
