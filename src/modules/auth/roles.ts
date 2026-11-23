export const ROLES = ["CUSTOMER", "RIDER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

// Where each role lands after signing in.
export const roleHome: Record<Role, string> = {
  CUSTOMER: "/account",
  RIDER: "/rider",
  ADMIN: "/admin",
};

// Where an unauthenticated visitor is sent to sign in for each role's area.
export const loginPath: Record<Role, string> = {
  CUSTOMER: "/login",
  RIDER: "/rider/login",
  ADMIN: "/admin/login",
};

export type CurrentUser = {
  id: string;
  role: Role;
  phone: string | null;
  fullName: string | null;
};
