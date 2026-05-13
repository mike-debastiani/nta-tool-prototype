import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type UserRole = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";

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
