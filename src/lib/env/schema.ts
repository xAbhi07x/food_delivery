import { z } from "zod";

// Only variables prefixed NEXT_PUBLIC_ may appear here: they are shipped to the browser.
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Server-only variables. Never prefix these with NEXT_PUBLIC_.
export const serverEnvSchema = z.object({
  // Unused until a later phase needs privileged access; kept optional so it is not demanded early.
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = PublicEnv & z.infer<typeof serverEnvSchema>;

type EnvSource = Record<string, string | undefined>;

export class EnvValidationError extends Error {
  constructor(public readonly invalidKeys: string[]) {
    super(
      `Invalid or missing environment variables: ${invalidKeys.join(", ")}. ` +
        "See .env.example.",
    );
    this.name = "EnvValidationError";
  }
}

// Reports variable names only, never values, so secrets cannot leak into logs.
// Empty strings count as unset, so a copied-but-unfilled .env.example fails clearly.
export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: EnvSource,
): z.infer<S> {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const keys = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new EnvValidationError(keys);
  }
  return result.data;
}
