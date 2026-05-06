import { requireUserProfile } from "@/lib/auth";
import { WorkspaceTestFlow } from "@/components/domain/workspace-test-flow";
import { SignOutButton } from "@/components/domain/sign-out-button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { type WorkspaceApplication } from "@/lib/test-flow-types";

export default async function WorkspaceTestPage() {
  const profile = await requireUserProfile(
    ["R2", "R3", "R5", "R6"],
    "/staff/login",
  );

  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id,applicant_id,status,created_at,updated_at,data,users!applications_applicant_id_fkey(display_name,email)",
    )
    .order("updated_at", { ascending: false });

  const initialApplications = (data ?? []) as WorkspaceApplication[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Workspace - R2 Testbereich</h1>
          <p className="text-sm text-muted-foreground">
            Eingeloggt als {profile.display_name ?? profile.email}
          </p>
        </div>
        <SignOutButton />
      </header>
      <Separator />
      <WorkspaceTestFlow userId={profile.id} initialApplications={initialApplications} />
    </main>
  );
}
