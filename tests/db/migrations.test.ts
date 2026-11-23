import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Default matches the local Supabase database defined in supabase/config.toml.
const connectionString =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:14322/postgres";

const migrationsDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "supabase",
  "migrations",
);

describe("database and migrations", () => {
  const client = new pg.Client({ connectionString });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("connects and runs a query", async () => {
    const { rows } = await client.query("select 1 as ok");
    expect(rows[0].ok).toBe(1);
  });

  it("has recorded every migration file as applied", async () => {
    const onDisk = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => name.split("_")[0])
      .sort();
    expect(onDisk.length).toBeGreaterThan(0);

    const { rows } = await client.query<{ version: string }>(
      "select version from supabase_migrations.schema_migrations order by version",
    );
    expect(rows.map((row) => row.version)).toEqual(onDisk);
  });

  it("is a Supabase database with the standard API roles", async () => {
    const { rows } = await client.query<{ rolname: string }>(
      "select rolname from pg_roles where rolname in ('anon', 'authenticated', 'service_role')",
    );
    expect(rows.map((row) => row.rolname).sort()).toEqual([
      "anon",
      "authenticated",
      "service_role",
    ]);
  });

  it("has only migration files in the migrations directory", () => {
    for (const name of readdirSync(migrationsDir)) {
      expect(statSync(path.join(migrationsDir, name)).isFile()).toBe(true);
      expect(name).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
      expect(
        readFileSync(path.join(migrationsDir, name), "utf8").length,
      ).toBeGreaterThan(0);
    }
  });
});
