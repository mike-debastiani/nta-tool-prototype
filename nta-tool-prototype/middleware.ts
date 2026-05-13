import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // `api/` nicht ausschliessen: Supabase-SSR braucht `getClaims()` auch auf API-Routen,
    // sonst schlagen z. B. POST /api/applications/r4-persist-decision mit 401/Session fehl.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
