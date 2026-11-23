import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "./database.types";

// Supabase stores the session in cookies named sb-<project>-auth-token (possibly chunked).
const hasSessionCookie = (request: NextRequest) =>
  request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));

// Refreshes an expiring session and forwards the new cookies. This is NOT an authorisation
// check: pages and server actions must verify the user themselves (see modules/auth).
export async function refreshSession(request: NextRequest) {
  if (!hasSessionCookie(request)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const env = getPublicEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}
