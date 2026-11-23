import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decideAccess } from "./access";
import { ROLES, type CurrentUser, type Role } from "./roles";

// The signed-in user, or null. The identity is verified with the Auth server (getUser, not the
// cookie alone) and the role is read from the profiles table, never from client-supplied data.
// Fails closed: a user with no valid profile is treated as signed out.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, phone, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile || !ROLES.includes(profile.role)) return null;

  return {
    id: profile.id,
    role: profile.role,
    phone: profile.phone,
    fullName: profile.full_name,
  };
});

// Call at the top of every protected page and server action. Redirects when access is not allowed.
export async function requireRole(
  allowed: Role | readonly Role[],
): Promise<CurrentUser> {
  const roles = typeof allowed === "string" ? [allowed] : allowed;
  const user = await getCurrentUser();
  const decision = decideAccess(user, roles);
  if (decision.kind === "redirect") redirect(decision.to);
  return user as CurrentUser;
}
