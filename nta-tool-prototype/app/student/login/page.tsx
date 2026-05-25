import { LoginCard } from "@/components/domain/login-card";
import { PrototypeEntryShell } from "@/components/domain/prototype-entry-shell";

export default function StudentLoginPage() {
  return (
    <PrototypeEntryShell narrow backHref="/" backLabel="Zurück zur Übersicht">
      <LoginCard
        title="Portal Anmeldung"
        description="Melden Sie sich mit Ihrem Studierenden-Testkonto an, um Anträge zu erstellen und den Status zu verfolgen."
        allowedRoles={["R1"]}
      />
    </PrototypeEntryShell>
  );
}
