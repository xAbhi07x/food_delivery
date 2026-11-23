import { loginPath, roleHome, type CurrentUser, type Role } from "./roles";

export type AccessDecision =
  { kind: "allow" } | { kind: "redirect"; to: string };

// Pure decision used by requireRole. Anonymous visitors go to the sign-in page of the area they
// asked for; signed-in users with the wrong role go to their own home (never into the other area).
export function decideAccess(
  user: Pick<CurrentUser, "role"> | null,
  allowed: readonly Role[],
): AccessDecision {
  if (!user) return { kind: "redirect", to: loginPath[allowed[0]] };
  if (!allowed.includes(user.role)) {
    return { kind: "redirect", to: roleHome[user.role] };
  }
  return { kind: "allow" };
}
