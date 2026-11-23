import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { classifyAuthError } from "@/modules/auth/errors";
import {
  provisionAdmin,
  provisionRider,
} from "../../scripts/lib/provision.mjs";
import {
  TEST_OTP_CODE,
  anonClient,
  deleteUserByEmail,
  deleteUserByPhone,
  digitsOf,
  secretClient,
  signInWithTestOtp,
} from "../helpers/supabase";

// Each test uses its own number so the per-number OTP cooldown never interferes.
const N = (suffix: number) => `+9199999000${String(suffix).padStart(2, "0")}`;
const PHONES = {
  signup: N(1),
  wrongCode: N(2),
  cooldown: N(3),
  riderUnknown: N(4),
  riderProvisioned: N(5),
  metadata: N(6),
  escalation: N(7),
  victim: N(8),
  adminVisibility: N(9),
};
const UNREGISTERED_REAL_LOOKING = "+919876500000";

const admin = secretClient();
const adminEmail = `admin-${randomUUID()}@example.test`;
const adminPassword = "Str0ngAdminPassw0rd";
const selfSignupEmail = `selfsignup-${randomUUID()}@example.test`;

async function cleanUp() {
  for (const phone of [...Object.values(PHONES), UNREGISTERED_REAL_LOOKING]) {
    await deleteUserByPhone(admin, phone);
  }
  await deleteUserByEmail(admin, adminEmail);
  await deleteUserByEmail(admin, selfSignupEmail);
}

beforeAll(cleanUp);
afterAll(cleanUp);

describe("customer phone OTP sign-in", () => {
  it("creates an account and a CUSTOMER profile on first sign-in", async () => {
    const client = await signInWithTestOtp(PHONES.signup);
    const { data: auth } = await client.auth.getUser();
    expect(auth.user?.phone).toBe(digitsOf(PHONES.signup));

    const { data: profile, error } = await client
      .from("profiles")
      .select("role, phone")
      .eq("id", auth.user!.id)
      .single();
    expect(error).toBeNull();
    expect(profile).toEqual({ role: "CUSTOMER", phone: PHONES.signup });
  });

  it("rejects a wrong code", async () => {
    const client = anonClient();
    const sent = await client.auth.signInWithOtp({ phone: PHONES.wrongCode });
    expect(sent.error).toBeNull();
    const verified = await client.auth.verifyOtp({
      phone: PHONES.wrongCode,
      token: "000000",
      type: "sms",
    });
    expect(verified.error).not.toBeNull();
    expect(classifyAuthError(verified.error!)).toBe("invalid_code");
    expect(verified.data.session).toBeNull();
  });

  it("reports an SMS delivery failure for a number that is not a test number", async () => {
    const { error } = await anonClient().auth.signInWithOtp({
      phone: UNREGISTERED_REAL_LOOKING,
    });
    expect(error).not.toBeNull();
    expect(classifyAuthError(error!)).toBe("sms_failed");
  });

  it("limits how often a code can be requested for one number", async () => {
    const client = anonClient();
    const first = await client.auth.signInWithOtp({ phone: PHONES.cooldown });
    expect(first.error).toBeNull();
    const second = await client.auth.signInWithOtp({ phone: PHONES.cooldown });
    expect(second.error).not.toBeNull();
    expect(classifyAuthError(second.error!)).toBe("rate_limited");
  });

  it("ignores a role passed in signup metadata", async () => {
    const client = anonClient();
    await client.auth.signInWithOtp({
      phone: PHONES.metadata,
      options: { data: { role: "ADMIN" } },
    });
    const verified = await client.auth.verifyOtp({
      phone: PHONES.metadata,
      token: TEST_OTP_CODE,
      type: "sms",
    });
    expect(verified.error).toBeNull();
    const { data: profile } = await client
      .from("profiles")
      .select("role")
      .eq("id", verified.data.user!.id)
      .single();
    expect(profile?.role).toBe("CUSTOMER");
  });
});

describe("rider phone OTP sign-in (accounts are pre-created)", () => {
  it("does not create an account for an unknown number", async () => {
    const { error } = await anonClient().auth.signInWithOtp({
      phone: PHONES.riderUnknown,
      options: { shouldCreateUser: false },
    });
    expect(error).not.toBeNull();
    expect(classifyAuthError(error!)).toBe("signup_disabled");

    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    expect(
      data.users.some((user) => user.phone === digitsOf(PHONES.riderUnknown)),
    ).toBe(false);
  });

  it("signs in a provisioned rider with the RIDER role", async () => {
    await provisionRider(admin, {
      phone: PHONES.riderProvisioned,
      fullName: "Test Rider",
    });
    const client = await signInWithTestOtp(PHONES.riderProvisioned, false);
    const { data: auth } = await client.auth.getUser();
    const { data: profile } = await client
      .from("profiles")
      .select("role, full_name")
      .eq("id", auth.user!.id)
      .single();
    expect(profile).toEqual({ role: "RIDER", full_name: "Test Rider" });
  });

  it("rejects provisioning with an invalid number or name", async () => {
    await expect(
      provisionRider(admin, { phone: "12345", fullName: "X" }),
    ).rejects.toThrow(/valid Indian mobile/);
    await expect(
      provisionRider(admin, { phone: PHONES.victim, fullName: "  " }),
    ).rejects.toThrow(/Name must be/);
  });
});

describe("privilege escalation through the public API", () => {
  it("lets a customer neither promote themselves nor read other profiles", async () => {
    await provisionRider(admin, { phone: PHONES.victim, fullName: "Victim" });
    const client = await signInWithTestOtp(PHONES.escalation);
    const { data: auth } = await client.auth.getUser();
    const me = auth.user!.id;

    const promote = await client
      .from("profiles")
      .update({ role: "ADMIN" })
      .eq("id", me);
    expect(promote.error?.code).toBe("42501");

    const rename = await client
      .from("profiles")
      .update({ full_name: "Still Me" })
      .eq("id", me)
      .select("full_name")
      .single();
    expect(rename.data?.full_name).toBe("Still Me");

    const visible = await client.from("profiles").select("id");
    expect(visible.data?.map((row) => row.id)).toEqual([me]);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", me)
      .single();
    expect(profile?.role).toBe("CUSTOMER");
  });

  it("gives an anonymous client no access to profiles", async () => {
    const { data, error } = await anonClient().from("profiles").select("id");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // Documents a known gap (see docs/decisions.md): email sign-up is enabled because admins need it.
  // The account is a powerless CUSTOMER; it can never become an admin without the secret key.
  it("gives a self-registered email account only the CUSTOMER role", async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signUp({
      email: selfSignupEmail,
      password: adminPassword,
    });
    expect(error).toBeNull();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, phone")
      .eq("id", data.user!.id)
      .single();
    expect(profile).toEqual({ role: "CUSTOMER", phone: null });
  });
});

describe("admin email and password sign-in", () => {
  it("rejects a weak password at provisioning", async () => {
    await expect(
      provisionAdmin(admin, {
        email: `weak-${randomUUID()}@example.test`,
        password: "short",
        fullName: "Weak",
      }),
    ).rejects.toThrow();
  });

  it("signs in a provisioned admin who can then read all profiles", async () => {
    await provisionAdmin(admin, {
      email: adminEmail,
      password: adminPassword,
      fullName: "Test Admin",
    });
    await provisionRider(admin, {
      phone: PHONES.adminVisibility,
      fullName: "Visible Rider",
    });

    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    expect(error).toBeNull();

    const { data: me } = await client
      .from("profiles")
      .select("role")
      .eq("id", data.user!.id)
      .single();
    expect(me?.role).toBe("ADMIN");

    const { data: all } = await client.from("profiles").select("id");
    expect(all!.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a wrong password", async () => {
    const { error } = await anonClient().auth.signInWithPassword({
      email: adminEmail,
      password: "Wrong-Password-123",
    });
    expect(error).not.toBeNull();
    expect(classifyAuthError(error!)).toBe("invalid_credentials");
  });
});
