import { parseEnv, publicEnvSchema, type PublicEnv } from "./schema";

export function getPublicEnv(): PublicEnv {
  // Next.js only inlines NEXT_PUBLIC_* values when they are referenced statically.
  return parseEnv(publicEnvSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
