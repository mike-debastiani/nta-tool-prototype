import { LoginCard } from "@/components/domain/login-card";
import { PrototypeEntryShell } from "@/components/domain/prototype-entry-shell";

export default function StaffLoginPage() {
  return (
    <PrototypeEntryShell narrow backHref="/" backLabel="Zurück zur Übersicht">
      <LoginCard
        title="Workspace Anmeldung"
        description="Melden Sie sich mit Ihrem Hochschul-Testkonto an, um Anträge zu bearbeiten und den NTA-Prozess in der Verwaltung abzubilden."
        allowedRoles={["R2", "R3", "R4", "R5", "R6", "R2R4"]}
      />
    </PrototypeEntryShell>
  );
}
