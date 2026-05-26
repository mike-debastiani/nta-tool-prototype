import { NextResponse } from "next/server";
import { type UserRole } from "@/lib/auth";
import { fetchWorkspaceApplicationsList } from "@/lib/workspace-applications-list";
import { createClient } from "@/utils/supabase/server";

const WORKSPACE_ROLES: UserRole[] = ["R2", "R3", "R4", "R5", "R6", "R2R4"];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: UserRole }>();

  if (!profile?.role || !WORKSPACE_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const applications = await fetchWorkspaceApplicationsList(supabase, profile.role);
  return NextResponse.json({ applications });
}
