import { describe, expect, it } from "vitest";
import {
  EnvValidationError,
  parseEnv,
  publicEnvSchema,
  serverEnvSchema,
} from "./schema";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:14321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
};

describe("parseEnv", () => {
  it("returns typed values when all required variables are present", () => {
    expect(parseEnv(publicEnvSchema, validPublic)).toEqual(validPublic);
  });

  it("fails fast when a required variable is missing", () => {
    expect(() =>
      parseEnv(publicEnvSchema, { NEXT_PUBLIC_SUPABASE_URL: "http://x.test" }),
    ).toThrow(EnvValidationError);
  });

  it("names the invalid variables", () => {
    try {
      parseEnv(publicEnvSchema, {});
      expect.unreachable("parseEnv should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).invalidKeys).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ]);
    }
  });

  it("rejects a malformed URL", () => {
    expect(() =>
      parseEnv(publicEnvSchema, {
        ...validPublic,
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      }),
    ).toThrow(EnvValidationError);
  });

  it("treats empty strings as unset", () => {
    expect(() =>
      parseEnv(publicEnvSchema, {
        ...validPublic,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toThrow(EnvValidationError);
  });

  it("never includes variable values in the error message", () => {
    const secret = "super-secret-value-123";
    try {
      parseEnv(publicEnvSchema, {
        NEXT_PUBLIC_SUPABASE_URL: secret,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ok",
      });
      expect.unreachable("parseEnv should have thrown");
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});

describe("serverEnvSchema", () => {
  it("accepts an unset secret key", () => {
    expect(parseEnv(serverEnvSchema, {})).toEqual({});
  });

  it("treats an empty secret key as unset", () => {
    expect(parseEnv(serverEnvSchema, { SUPABASE_SECRET_KEY: "" })).toEqual({});
  });
});
