import { describe, expect, it } from "vitest";
import {
  adminLoginSchema,
  otpCodeSchema,
  phoneSchema,
  portalSchema,
} from "./schemas";

describe("phoneSchema", () => {
  it("normalises a valid number to E.164", () => {
    expect(phoneSchema.parse(" 98765 43210 ")).toBe("+919876543210");
  });

  it("rejects an invalid number with a user-facing message", () => {
    const result = phoneSchema.safeParse("123");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/valid 10-digit/);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpCodeSchema.parse(" 123456 ")).toBe("123456");
  });

  it.each(["12345", "1234567", "12345a", ""])("rejects %j", (value) => {
    expect(otpCodeSchema.safeParse(value).success).toBe(false);
  });
});

describe("portalSchema", () => {
  it("only allows the phone sign-in portals", () => {
    expect(portalSchema.safeParse("customer").success).toBe(true);
    expect(portalSchema.safeParse("rider").success).toBe(true);
    expect(portalSchema.safeParse("admin").success).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("lowercases and trims the email", () => {
    expect(
      adminLoginSchema.parse({ email: "  Boss@Example.COM ", password: "x" }),
    ).toEqual({ email: "boss@example.com", password: "x" });
  });

  it("rejects a malformed email or empty password", () => {
    expect(
      adminLoginSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
    expect(
      adminLoginSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});
