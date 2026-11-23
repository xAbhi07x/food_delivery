import { describe, expect, it } from "vitest";
import { withRollback } from "../helpers/db";

// Standing rule for every phase: no table in an API-exposed schema may be without RLS.
describe("row level security baseline", () => {
  it("has RLS enabled on every table in the public schema", () =>
    withRollback(async (client) => {
      const { rows } = await client.query(
        `select c.relname
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
         order by c.relname`,
      );
      expect(rows.map((r) => r.relname)).toEqual([]);
    }));

  it("lets anonymous users read no public tables", () =>
    withRollback(async (client) => {
      const { rows } = await client.query(
        `select c.relname
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'p')
           and has_table_privilege('anon', c.oid, 'SELECT')
         order by c.relname`,
      );
      // Phase 3 will deliberately open catalog tables; add them here when it does.
      expect(rows.map((r) => r.relname)).toEqual([]);
    }));
});
