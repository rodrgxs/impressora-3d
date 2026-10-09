import type { PrismaClient } from "@prisma/client";
import type { PublicUser } from "./service";

export async function accountQuotes(db: Pick<PrismaClient, "quoteRequest">, user: PublicUser | null) {
  if (!user) throw new Error("Unauthenticated");
  return db.quoteRequest.findMany({
    where: { userId: user.id },
    select: { id: true, partName: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
