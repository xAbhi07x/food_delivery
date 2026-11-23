import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../scripts/lib/provision.mjs";

// Fixed code accepted for the numbers listed under [auth.sms.test_otp] in supabase/config.toml.
export const TEST_OTP_CODE = "123456";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Start the local stack (npm run db:start) and fill .env.local.`,
    );
  }
  return value;
}

// A client that behaves like the browser/app: publishable key, no stored session.
export function anonClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function secretClient(): SupabaseClient {
  return createAdminClient();
}

// GoTrue stores phone numbers without the leading +.
export const digitsOf = (e164: string) => e164.replace(/^\+/, "");

export async function deleteUserByPhone(admin: SupabaseClient, e164: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const match = data.users.find((user) => user.phone === digitsOf(e164));
  if (match) await admin.auth.admin.deleteUser(match.id);
}

export async function deleteUserByEmail(admin: SupabaseClient, email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const match = data.users.find((user) => user.email === email);
  if (match) await admin.auth.admin.deleteUser(match.id);
}

// Signs in through the real OTP flow with a test number and returns the authenticated client.
export async function signInWithTestOtp(
  e164: string,
  shouldCreateUser = true,
): Promise<SupabaseClient> {
  const client = anonClient();
  const sent = await client.auth.signInWithOtp({
    phone: e164,
    options: { shouldCreateUser },
  });
  if (sent.error) throw sent.error;
  const verified = await client.auth.verifyOtp({
    phone: e164,
    token: TEST_OTP_CODE,
    type: "sms",
  });
  if (verified.error) throw verified.error;
  return client;
}
