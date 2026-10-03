import { z } from "zod";

export const quoteRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(8).max(24)
    .transform((phone) => phone.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{8,15}$/)),
  category: z.enum(["Automotivo", "Peça sob medida", "Outros nichos"]),
  part: z.string().trim().min(2).max(150),
  application: z.string().trim().max(160).optional().transform((value) => value || null),
  quantity: z.number().int().positive().max(9999),
  description: z.string().trim().min(10).max(1600),
}).strict();

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
