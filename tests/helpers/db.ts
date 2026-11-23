import { randomUUID } from "node:crypto";
import pg from "pg";

// Default matches the local Supabase database defined in supabase/config.toml.
export const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:14322/postgres";

export type DbClient = pg.Client;

// Runs fn inside a transaction that is always rolled back, so tests leave no data behind.
export async function withRollback<T>(
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    await client.end();
  }
}

type AuthUserInput = {
  phone?: string; // digits only, as GoTrue stores it (no leading +)
  email?: string;
  metadata?: Record<string, unknown>;
};

// Inserts directly into auth.users, which fires the signup trigger.
export async function insertAuthUser(
  client: DbClient,
  input: AuthUserInput = {},
): Promise<string> {
  const id = randomUUID();
  await client.query(
    `insert into auth.users (id, aud, role, email, phone, raw_user_meta_data)
     values ($1, 'authenticated', 'authenticated', $2, $3, $4)`,
    [
      id,
      input.email ?? null,
      input.phone ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return id;
}

// Promotion is a privileged step: tests do it as the superuser, like the provisioning script.
export async function setRole(
  client: DbClient,
  userId: string,
  role: "CUSTOMER" | "RIDER" | "ADMIN",
) {
  await client.query("update public.profiles set role = $2 where id = $1", [
    userId,
    role,
  ]);
}

// Runs fn as the given signed-in user (or as anon when userId is null), the way PostgREST does.
export async function asRole<T>(
  client: DbClient,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  const claims = userId
    ? { sub: userId, role: "authenticated" }
    : { role: "anon" };
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify(claims),
  ]);
  await client.query(`set local role ${userId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await client.query("reset role");
    await client.query("select set_config('request.jwt.claims', '', true)");
  }
}

// Runs a statement that is expected to fail, without aborting the surrounding transaction.
// Returns the Postgres error code (for example 42501 = insufficient privilege), or null on success.
export async function errorCodeOf(
  client: DbClient,
  sql: string,
  params: unknown[] = [],
): Promise<string | null> {
  await client.query("savepoint expected_failure");
  try {
    await client.query(sql, params);
    await client.query("release savepoint expected_failure");
    return null;
  } catch (error) {
    await client.query("rollback to savepoint expected_failure");
    return (error as { code?: string }).code ?? "unknown";
  }
}
