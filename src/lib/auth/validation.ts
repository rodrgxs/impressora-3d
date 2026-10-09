import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(128); // Do not trim or silently truncate passwords.
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
}).strict();
export const loginSchema = z.object({ email, password });
