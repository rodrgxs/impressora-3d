import { z } from "zod";

export const quoteRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z
      .string()
      .trim()
      .min(8)
      .max(24)
      .transform((phone) => phone.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{8,15}$/)),
    category: z.enum(["Automotivo", "Peça sob medida", "Outros nichos"]),
    part: z.string().trim().min(2).max(150),
    application: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((value) => value || null),
    quantity: z.number().int().positive().max(9999),
    description: z.string().trim().min(10).max(1600),
  })
  .strict();

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const quoteErrorMessages: Record<string, string> = {
  name: "Informe seu nome com 2 a 100 caracteres.",
  email: "Informe um e-mail válido com até 254 caracteres.",
  phone: "Informe um telefone com 8 a 15 dígitos, incluindo o DDD.",
  category: "Selecione uma categoria.",
  part: "Descreva o nome da peça com 2 a 150 caracteres.",
  application: "Use no máximo 160 caracteres para a aplicação.",
  quantity: "Informe uma quantidade inteira de 1 a 9.999.",
  description: "Descreva seu projeto com 10 a 1.600 caracteres.",
};
export function quoteFieldErrors(
  issues: readonly { path: readonly PropertyKey[] }[],
) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (Object.hasOwn(quoteErrorMessages, field))
      fields[field] = quoteErrorMessages[field];
  }
  return fields;
}
