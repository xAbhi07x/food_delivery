export type AuthErrorCode =
  | "rate_limited"
  | "sms_failed"
  | "invalid_code"
  | "invalid_credentials"
  | "signup_disabled"
  | "unknown";

type AuthErrorLike = { code?: string; status?: number; message?: string };

// Maps a Supabase Auth error to a stable code the UI can show a specific message for.
export function classifyAuthError(error: AuthErrorLike): AuthErrorCode {
  const code = error.code ?? "";
  if (
    error.status === 429 ||
    code === "over_sms_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit"
  ) {
    return "rate_limited";
  }
  if (code === "sms_send_failed") return "sms_failed";
  if (code === "otp_disabled") return "signup_disabled";
  if (code === "otp_expired" || code === "validation_failed") {
    return "invalid_code";
  }
  if (code === "invalid_credentials") return "invalid_credentials";
  if (/token has expired or is invalid/i.test(error.message ?? "")) {
    return "invalid_code";
  }
  return "unknown";
}

export const authMessages: Record<AuthErrorCode, string> = {
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  sms_failed:
    "We could not send the code to this number. Check the number and try again.",
  invalid_code: "That code is incorrect or has expired. Request a new one.",
  invalid_credentials: "Incorrect email or password.",
  signup_disabled: "This number is not registered for sign-in.",
  unknown: "Something went wrong. Please try again.",
};
