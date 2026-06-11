import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type UserRole = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R2R4";

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
};

export async function requireUserProfile(
  allowedRoles: UserRole[],
  fallbackPath: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(fallbackPath);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id,email,role,display_name")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  if (!profile || !allowedRoles.includes(profile.role)) {
    if (allowedRoles.includes("R1")) {
      redirect("/student/login");
    }
    redirect("/staff/login");
  }

  return profile;
}

/**
 * Reads the signed-in user's role without redirecting. Returns `null` when no
 * session exists (e.g. on public login pages). Used by the global role
 * indicator banner so it can show the active role on any route.
 */
export async function getOptionalUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "role">>();

  return profile?.role ?? null;
}
