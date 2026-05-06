import { requireUserProfile } from "@/lib/auth";
import { PortalTestFlow } from "@/components/domain/portal-test-flow";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/domain/sign-out-button";
import { type ApplicationRow } from "@/lib/test-flow-types";
import { createClient } from "@/utils/supabase/server";

export default async function PortalTestPage() {
  const profile = await requireUserProfile(["R1"], "/student/login");
  const supabase = await createClient();

  const { data } = await supabase
    .from("applications")
    .select("id,applicant_id,status,data,created_at,updated_at")
    .eq("applicant_id", profile.id)
    .order("updated_at", { ascending: false });

  const initialApplications = (data ?? []) as ApplicationRow[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Portal - R1 Testbereich</h1>
          <p className="text-sm text-muted-foreground">
            Eingeloggt als {profile.display_name ?? profile.email}
          </p>
        </div>
        <SignOutButton />
      </header>
      <Separator />
      <PortalTestFlow
        userId={profile.id}
        initialApplications={initialApplications}
      />
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Minimaler Testflow: Antrag erfassen, uebermitteln und Status live von
          R2 zurueckspiegeln.
        </CardContent>
      </Card>
    </main>
  );
}
