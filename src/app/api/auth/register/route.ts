import { authService } from "@/auth";
import { createRegisterHandler } from "@/lib/auth/register-handler";
export const POST = createRegisterHandler(authService);
export const runtime = "nodejs";
