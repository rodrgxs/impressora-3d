import type { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword, verifyPassword } from "./password";
import type { ConsumeLimit } from "./rate-limit";
import { loginSchema, registrationSchema } from "./validation";

export type PublicUser = { id: string; name: string | null; email: string | null; role: UserRole };
export const publicUserSelect = { id: true, name: true, email: true, role: true } as const;
export const REGISTRATION_MESSAGE = "Se o cadastro puder ser realizado, sua conta estará pronta. Tente entrar com o e-mail e a senha informados.";

export function createAuthService(db: Pick<PrismaClient, "user">, consume: ConsumeLimit) {
  return {
    async register(payload: unknown, ip: string) {
      if (!await consume("register-ip", ip, 5)) return "limited" as const;
      const parsed = registrationSchema.safeParse(payload);
      if (!parsed.success) return "invalid" as const;
      if (!await consume("register-email", parsed.data.email, 5)) return "limited" as const;
      const passwordHash = await hashPassword(parsed.data.password);
      try {
        await db.user.create({
          data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "CUSTOMER" },
          select: { id: true },
        });
      } catch (error) {
        // Duplicate e-mails (including concurrent signups) get the same status/message.
        if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
      }
      return "accepted" as const;
    },
    async login(payload: unknown, ip: string): Promise<PublicUser | null> {
      if (!await consume("login-ip", ip, 20)) return null;
      const parsed = loginSchema.safeParse(payload);
      if (!parsed.success) return null;
      if (!await consume("login-email", parsed.data.email, 10)) return null;
      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
        select: { ...publicUserSelect, passwordHash: true },
      });
      const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
      if (!user || !valid) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
    async currentUser(id: string): Promise<PublicUser | null> {
      return db.user.findUnique({ where: { id }, select: publicUserSelect });
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;

export function hasRole(user: PublicUser | null, role: UserRole) {
  return user?.role === role;
}
