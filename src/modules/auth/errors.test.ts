import { describe, expect, it } from "vitest";
import { authMessages, classifyAuthError } from "./errors";

describe("classifyAuthError", () => {
  it.each([
    [{ code: "over_sms_send_rate_limit", status: 429 }, "rate_limited"],
    [{ code: "over_request_rate_limit" }, "rate_limited"],
    [{ status: 429 }, "rate_limited"],
    [{ code: "sms_send_failed" }, "sms_failed"],
    [{ code: "otp_disabled" }, "signup_disabled"],
    [{ code: "otp_expired" }, "invalid_code"],
    [{ message: "Token has expired or is invalid" }, "invalid_code"],
    [{ code: "invalid_credentials" }, "invalid_credentials"],
    [{ code: "something_new" }, "unknown"],
    [{}, "unknown"],
  ])("classifies %j as %s", (error, expected) => {
    expect(classifyAuthError(error)).toBe(expected);
  });

  it("has a message for every code", () => {
    for (const message of Object.values(authMessages)) {
      expect(message.length).toBeGreaterThan(10);
    }
  });
});
