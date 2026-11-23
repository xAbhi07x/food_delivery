// Indian mobile numbers only for now (the service is local to Murliganj, Bihar). The SRS asks for a
// "valid mobile number" (FR-ORDER-01) without defining the format; widen this if that changes.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

// Accepts 9876543210, 09876543210, 919876543210, +91 98765 43210 and similar.
// Returns E.164 (+919876543210) or null when the input is not a valid Indian mobile number.
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+91")) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return INDIAN_MOBILE.test(digits) ? `+91${digits}` : null;
}
