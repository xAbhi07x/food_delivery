// Privileged account provisioning (decision D-02): riders and admins are never self-service.
// Uses the Supabase secret key, so it must only run on a trusted machine or server, never in the browser.
import { createClient } from "@supabase/supabase-js";

// Same rule as src/modules/auth/phone.ts (Indian mobile numbers). Keep the two in sync.
export function normalizeIndianMobile(input) {
  let digits = String(input).replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+91")) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export function createAdminClient(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).",
    );
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// New auth users always start as CUSTOMER (database trigger). Promotion happens here, with the
// secret key, and is rolled back by deleting the user if it fails.
async function promote(client, userId, role, fullName) {
  const { data, error } = await client
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", userId)
    .select("id, role, phone, full_name")
    .single();
  if (error) {
    await client.auth.admin.deleteUser(userId);
    throw new Error(`Could not set role ${role}: ${error.message}`);
  }
  return data;
}

function validName(fullName) {
  const name = String(fullName ?? "").trim();
  if (name.length < 1 || name.length > 100) {
    throw new Error("Name must be 1 to 100 characters.");
  }
  return name;
}

export async function provisionRider(client, { phone, fullName }) {
  const e164 = normalizeIndianMobile(phone);
  if (!e164) throw new Error("Enter a valid Indian mobile number.");
  const name = validName(fullName);

  const { data, error } = await client.auth.admin.createUser({
    phone: e164,
    phone_confirm: true,
  });
  if (error) throw new Error(`Could not create the rider: ${error.message}`);
  return promote(client, data.user.id, "RIDER", name);
}

export async function provisionAdmin(client, { email, password, fullName }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  const name = validName(fullName);

  const { data, error } = await client.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Could not create the admin: ${error.message}`);
  return promote(client, data.user.id, "ADMIN", name);
}

export async function deleteUser(client, userId) {
  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Could not delete user: ${error.message}`);
}
