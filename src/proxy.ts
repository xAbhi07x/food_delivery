import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/session";

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Skip static assets and the health endpoint.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
