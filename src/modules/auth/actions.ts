"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authMessages, classifyAuthError } from "./errors";
import type { OtpFormState, PasswordFormState } from "./form-state";
import {
  adminLoginSchema,
  otpCodeSchema,
  phoneSchema,
  portalSchema,
  type Portal,
} from "./schemas";
import { roleHome, type Role } from "./roles";

// Which role may sign in through which portal. Checked after the code is verified.
const portalRole: Record<Portal, Role> = {
  customer: "CUSTOMER",
  rider: "RIDER",
};

const RIDER_NOTICE =
  "If this number is registered as a rider, a code has been sent.";

// One action drives both steps of the phone OTP form: "request" sends a code, "verify" checks it.
export async function otpAction(
  _previous: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  const intent = formData.get("intent");
  if (intent === "reset") return { step: "phone" };

  const portal = portalSchema.safeParse(formData.get("portal"));
  const phone = phoneSchema.safeParse(formData.get("phone"));
  if (!portal.success) return { step: "phone", error: authMessages.unknown };
  if (!phone.success) {
    return { step: "phone", error: phone.error.issues[0].message };
  }

  return intent === "verify"
    ? verifyCode(portal.data, phone.data, formData)
    : requestCode(portal.data, phone.data);
}

async function requestCode(
  portal: Portal,
  phone: string,
): Promise<OtpFormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    // Only the customer portal may create accounts. Riders are pre-created by an admin.
    options: { channel: "sms", shouldCreateUser: portal === "customer" },
  });

  if (!error) {
    return {
      step: "code",
      phone,
      notice: portal === "rider" ? RIDER_NOTICE : "We sent a 6-digit code.",
    };
  }

  const code = classifyAuthError(error);
  // Do not reveal whether a rider number exists: look the same as a successful send.
  if (code === "signup_disabled" && portal === "rider") {
    return { step: "code", phone, notice: RIDER_NOTICE };
  }
  return { step: "phone", phone, error: authMessages[code] };
}

async function verifyCode(
  portal: Portal,
  phone: string,
  formData: FormData,
): Promise<OtpFormState> {
  const token = otpCodeSchema.safeParse(formData.get("code"));
  if (!token.success) {
    return { step: "code", phone, error: token.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: token.data,
    type: "sms",
  });
  if (error || !data.user) {
    return {
      step: "code",
      phone,
      error: authMessages[classifyAuthError(error ?? {})],
    };
  }

  // The role comes from the database. Wrong portal for this account: end the session again.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.role !== portalRole[portal]) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      step: "phone",
      error:
        portal === "rider"
          ? "This number is not registered as a rider."
          : "This number cannot sign in here.",
    };
  }

  redirect(roleHome[profile.role]);
}

export async function adminSignIn(
  _previous: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: authMessages.invalid_credentials };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const code = classifyAuthError(error ?? {});
    return {
      error:
        code === "rate_limited"
          ? authMessages.rate_limited
          : authMessages.invalid_credentials,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "ADMIN") {
    // Same message as a wrong password so the form does not reveal which accounts exist.
    await supabase.auth.signOut({ scope: "local" });
    return { error: authMessages.invalid_credentials };
  }

  redirect(roleHome.ADMIN);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
