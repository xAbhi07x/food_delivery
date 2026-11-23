import "server-only";
import { getPublicEnv } from "./public";
import { parseEnv, serverEnvSchema, type ServerEnv } from "./schema";

export function getServerEnv(): ServerEnv {
  return {
    ...getPublicEnv(),
    ...parseEnv(serverEnvSchema, {
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    }),
  };
}
