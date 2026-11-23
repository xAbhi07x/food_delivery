import { describe, expect, it } from "vitest";
import {
  asRole,
  errorCodeOf,
  insertAuthUser,
  setRole,
  withRollback,
} from "../helpers/db";

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

describe("profiles: signup trigger", () => {
  it("creates a CUSTOMER profile with an E.164 phone for a phone signup", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client, { phone: "919999900101" });
      const { rows } = await client.query(
        "select role, phone, full_name from public.profiles where id = $1",
        [id],
      );
      expect(rows).toEqual([
        { role: "CUSTOMER", phone: "+919999900101", full_name: null },
      ]);
    }));

  it("creates a profile with a null phone for an email-only signup", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client, { email: "a@example.test" });
      const { rows } = await client.query(
        "select role, phone from public.profiles where id = $1",
        [id],
      );
      expect(rows).toEqual([{ role: "CUSTOMER", phone: null }]);
    }));

  it("ignores a role supplied in signup metadata", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client, {
        phone: "919999900102",
        metadata: { role: "ADMIN", user_role: "ADMIN" },
      });
      const { rows } = await client.query(
        "select role from public.profiles where id = $1",
        [id],
      );
      expect(rows[0].role).toBe("CUSTOMER");
    }));

  it("removes the profile when the auth user is deleted", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client, { phone: "919999900103" });
      await client.query("delete from auth.users where id = $1", [id]);
      const { rowCount } = await client.query(
        "select 1 from public.profiles where id = $1",
        [id],
      );
      expect(rowCount).toBe(0);
    }));
});

describe("profiles: constraints", () => {
  it("rejects a malformed phone number", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client);
      const code = await errorCodeOf(
        client,
        "update public.profiles set phone = $2 where id = $1",
        [id, "98765"],
      );
      expect(code).toBe(CHECK_VIOLATION);
    }));

  it("rejects an empty or oversized name", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client);
      for (const name of ["", "x".repeat(101)]) {
        const code = await errorCodeOf(
          client,
          "update public.profiles set full_name = $2 where id = $1",
          [id, name],
        );
        expect(code).toBe(CHECK_VIOLATION);
      }
    }));

  it("keeps updated_at moving forward on update", () =>
    withRollback(async (client) => {
      const id = await insertAuthUser(client);
      await client.query(
        "update public.profiles set updated_at = now() - interval '1 day' where id = $1",
        [id],
      );
      await client.query(
        "update public.profiles set full_name = 'A' where id = $1",
        [id],
      );
      const { rows } = await client.query(
        "select updated_at > now() - interval '1 minute' as fresh from public.profiles where id = $1",
        [id],
      );
      expect(rows[0].fresh).toBe(true);
    }));
});

describe("profiles: row level security (reads)", () => {
  it("lets a user read only their own profile", () =>
    withRollback(async (client) => {
      const alice = await insertAuthUser(client, { phone: "919999900111" });
      await insertAuthUser(client, { phone: "919999900112" });
      const rows = await asRole(client, alice, async () =>
        (await client.query("select id from public.profiles")).rows.map(
          (r) => r.id,
        ),
      );
      expect(rows).toEqual([alice]);
    }));

  it("does not let a rider or customer read other profiles", () =>
    withRollback(async (client) => {
      const customer = await insertAuthUser(client, { phone: "919999900113" });
      const rider = await insertAuthUser(client, { phone: "919999900114" });
      await setRole(client, rider, "RIDER");
      for (const user of [customer, rider]) {
        const count = await asRole(
          client,
          user,
          async () =>
            (await client.query("select id from public.profiles")).rowCount,
        );
        expect(count).toBe(1);
      }
    }));

  it("lets an admin read all profiles", () =>
    withRollback(async (client) => {
      const admin = await insertAuthUser(client, {
        email: "admin@example.test",
      });
      await setRole(client, admin, "ADMIN");
      await insertAuthUser(client, { phone: "919999900115" });
      await insertAuthUser(client, { phone: "919999900116" });
      const { rows: expected } = await client.query(
        "select count(*)::int as n from public.profiles",
      );
      const count = await asRole(
        client,
        admin,
        async () =>
          (await client.query("select id from public.profiles")).rowCount,
      );
      expect(count).toBe(expected[0].n);
      expect(count).toBeGreaterThanOrEqual(3);
    }));

  it("denies anonymous access entirely", () =>
    withRollback(async (client) => {
      const code = await asRole(client, null, () =>
        errorCodeOf(client, "select id from public.profiles"),
      );
      expect(code).toBe(INSUFFICIENT_PRIVILEGE);
    }));
});

describe("profiles: privilege escalation is impossible", () => {
  it("lets a user change their own name", () =>
    withRollback(async (client) => {
      const alice = await insertAuthUser(client, { phone: "919999900121" });
      const updated = await asRole(
        client,
        alice,
        async () =>
          (
            await client.query(
              "update public.profiles set full_name = 'Alice' where id = $1",
              [alice],
            )
          ).rowCount,
      );
      expect(updated).toBe(1);
    }));

  it("denies a user changing their own role", () =>
    withRollback(async (client) => {
      const alice = await insertAuthUser(client, { phone: "919999900122" });
      for (const role of ["ADMIN", "RIDER"]) {
        const code = await asRole(client, alice, () =>
          errorCodeOf(
            client,
            "update public.profiles set role = $2 where id = $1",
            [alice, role],
          ),
        );
        expect(code).toBe(INSUFFICIENT_PRIVILEGE);
      }
      const { rows } = await client.query(
        "select role from public.profiles where id = $1",
        [alice],
      );
      expect(rows[0].role).toBe("CUSTOMER");
    }));

  it("denies a user changing their own phone or id", () =>
    withRollback(async (client) => {
      const alice = await insertAuthUser(client, { phone: "919999900123" });
      for (const column of ["phone", "id"]) {
        const code = await asRole(client, alice, () =>
          errorCodeOf(
            client,
            `update public.profiles set ${column} = ${column} where id = $1`,
            [alice],
          ),
        );
        expect(code).toBe(INSUFFICIENT_PRIVILEGE);
      }
    }));

  it("updates nothing when a user targets someone else's profile", () =>
    withRollback(async (client) => {
      const alice = await insertAuthUser(client, { phone: "919999900124" });
      const bob = await insertAuthUser(client, { phone: "919999900125" });
      const updated = await asRole(
        client,
        alice,
        async () =>
          (
            await client.query(
              "update public.profiles set full_name = 'Hacked' where id = $1",
              [bob],
            )
          ).rowCount,
      );
      expect(updated).toBe(0);
    }));

  it("does not let an admin edit profiles through the API either", () =>
    withRollback(async (client) => {
      const admin = await insertAuthUser(client, {
        email: "admin2@example.test",
      });
      await setRole(client, admin, "ADMIN");
      const other = await insertAuthUser(client, { phone: "919999900126" });
      const updated = await asRole(
        client,
        admin,
        async () =>
          (
            await client.query(
              "update public.profiles set full_name = 'X' where id = $1",
              [other],
            )
          ).rowCount,
      );
      expect(updated).toBe(0);
    }));

  it("denies client inserts and deletes", () =>
    withRollback(async (client) => {
      const alice = await insertAuthUser(client, { phone: "919999900127" });
      const insertCode = await asRole(client, alice, () =>
        errorCodeOf(
          client,
          "insert into public.profiles (id, role) values (gen_random_uuid(), 'ADMIN')",
        ),
      );
      const deleteCode = await asRole(client, alice, () =>
        errorCodeOf(client, "delete from public.profiles where id = $1", [
          alice,
        ]),
      );
      expect(insertCode).toBe(INSUFFICIENT_PRIVILEGE);
      expect(deleteCode).toBe(INSUFFICIENT_PRIVILEGE);
    }));

  // Guards against a future broad "grant update" quietly reopening the hole.
  it("never grants API roles update access to sensitive columns", () =>
    withRollback(async (client) => {
      const { rows } = await client.query(
        `select r.role, c.col,
                has_column_privilege(r.role, 'public.profiles', c.col, 'UPDATE') as can_update
         from (values ('anon'), ('authenticated')) as r(role),
              (values ('id'), ('role'), ('phone'), ('created_at')) as c(col)`,
      );
      expect(rows.filter((r) => r.can_update)).toEqual([]);
    }));
});

describe("current_user_role()", () => {
  it("returns the signed-in user's role", () =>
    withRollback(async (client) => {
      const rider = await insertAuthUser(client, { phone: "919999900131" });
      await setRole(client, rider, "RIDER");
      const role = await asRole(
        client,
        rider,
        async () =>
          (await client.query("select public.current_user_role() as r")).rows[0]
            .r,
      );
      expect(role).toBe("RIDER");
    }));

  it("is not callable by anonymous users", () =>
    withRollback(async (client) => {
      const code = await asRole(client, null, () =>
        errorCodeOf(client, "select public.current_user_role()"),
      );
      expect(code).toBe(INSUFFICIENT_PRIVILEGE);
    }));

  it("keeps trigger helper functions away from API roles", () =>
    withRollback(async (client) => {
      const { rows } = await client.query(
        `select f.name, r.role, has_function_privilege(r.role, f.sig, 'EXECUTE') as can_exec
         from (values ('handle_new_user', 'public.handle_new_user()'),
                      ('set_updated_at', 'public.set_updated_at()')) as f(name, sig),
              (values ('anon'), ('authenticated')) as r(role)`,
      );
      expect(rows.filter((r) => r.can_exec)).toEqual([]);
    }));
});
