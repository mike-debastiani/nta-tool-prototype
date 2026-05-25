import Link from "next/link";
import { Building2, GraduationCap } from "lucide-react";

import { PrototypeEntryShell } from "@/components/domain/prototype-entry-shell";
import { Button } from "@/components/ui/button";
import { APPLICATION_CONTENT_PANEL_CARD_CLASS } from "@/lib/design-tokens/application-content-panel";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <PrototypeEntryShell>
      <header className="mb-10 max-w-2xl">
        <p className={cn(hfTypography.paragraphMiniMedium, "mb-2 text-stone-500")}>
          HSLU · Bachelorprojekt
        </p>
        <h1 className={cn(hfTypography.h2, "text-stone-900")}>
          NTA-Prototyp
        </h1>
        <p className={cn(hfTypography.paragraphRegular, "mt-4 text-stone-600")}>
          Funktionaler Web-Prototyp zur Simulation des Nachteilsausgleichs (NTA)
          an Hochschulen. Er dient Forschung und Usability-Tests — kein
          produktives System. Wählen Sie den Bereich, in den Sie sich anmelden
          möchten.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <section
          className={cn(
            APPLICATION_CONTENT_PANEL_CARD_CLASS,
            "flex flex-col gap-5 p-6",
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <h2 className={cn(hfTypography.h4, "text-stone-900")}>Portal</h2>
            <p className={cn(hfTypography.paragraphSmall, "text-stone-600")}>
              Perspektive Studierende: Antrag erstellen, Beratung und
              Empfehlung durchlaufen, Status verfolgen und Anpassungen
              vornehmen.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/student/login">Zum Portal anmelden</Link>
          </Button>
        </section>

        <section
          className={cn(
            APPLICATION_CONTENT_PANEL_CARD_CLASS,
            "flex flex-col gap-5 p-6",
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-stone-200/80 text-stone-700">
            <Building2 className="size-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <h2 className={cn(hfTypography.h4, "text-stone-900")}>Workspace</h2>
            <p className={cn(hfTypography.paragraphSmall, "text-stone-600")}>
              Perspektive Hochschule: eingereichte Anträge bearbeiten, Beratung
              und Empfehlung verfassen, Review und Entscheidung im Prozess
              abbilden.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/staff/login">Zum Workspace anmelden</Link>
          </Button>
        </section>
      </div>

      <p className={cn(hfTypography.paragraphMini, "mt-10 max-w-2xl text-stone-500")}>
        Testkonten und Demo-Funktionen finden Sie nach der Anmeldung in den
        jeweiligen Bereichen. Die Anmeldung erfolgt per E-Mail und Passwort.
      </p>
    </PrototypeEntryShell>
  );
}
