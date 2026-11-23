import { describe, expect, it } from "vitest";
import { normalizeIndianMobile } from "./phone";

describe("normalizeIndianMobile", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["098765 43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["(+91) 9876543210", "+919876543210"],
    ["  6000000000 ", "+916000000000"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each([
    "",
    "12345",
    "5876543210", // must start with 6-9
    "98765432101", // too long
    "987654321", // too short
    "+14155552671", // not an Indian number
    "+9198765",
    "abcdefghij",
    "9876543210; drop table",
  ])("rejects %j", (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});
