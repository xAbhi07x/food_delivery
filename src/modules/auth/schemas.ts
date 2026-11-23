import { z } from "zod";
import { normalizeIndianMobile } from "./phone";

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => normalizeIndianMobile(value) !== null, {
    message: "Enter a valid 10-digit mobile number.",
  })
  .transform((value) => normalizeIndianMobile(value) as string);

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");

export const portalSchema = z.enum(["customer", "rider"]);
export type Portal = z.infer<typeof portalSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});
