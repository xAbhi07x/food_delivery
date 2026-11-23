import { describe, expect, it } from "vitest";
import { decideAccess } from "./access";
import { loginPath, roleHome } from "./roles";

describe("decideAccess", () => {
  it("sends anonymous visitors to the sign-in page of the requested area", () => {
    expect(decideAccess(null, ["CUSTOMER"])).toEqual({
      kind: "redirect",
      to: loginPath.CUSTOMER,
    });
    expect(decideAccess(null, ["RIDER"])).toEqual({
      kind: "redirect",
      to: "/rider/login",
    });
    expect(decideAccess(null, ["ADMIN"])).toEqual({
      kind: "redirect",
      to: "/admin/login",
    });
  });

  it("allows a user whose role is permitted", () => {
    expect(decideAccess({ role: "RIDER" }, ["RIDER"])).toEqual({
      kind: "allow",
    });
    expect(decideAccess({ role: "ADMIN" }, ["RIDER", "ADMIN"])).toEqual({
      kind: "allow",
    });
  });

  it("never lets a role into another role's area", () => {
    const roles = ["CUSTOMER", "RIDER", "ADMIN"] as const;
    for (const user of roles) {
      for (const area of roles) {
        const decision = decideAccess({ role: user }, [area]);
        if (user === area) {
          expect(decision).toEqual({ kind: "allow" });
        } else {
          expect(decision).toEqual({ kind: "redirect", to: roleHome[user] });
        }
      }
    }
  });
});
