import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/auth";
import { createQuoteHandler } from "@/lib/quotes/handler";
export const POST = createQuoteHandler(prisma, getCurrentUser);
export const runtime = "nodejs";
