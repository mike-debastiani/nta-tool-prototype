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
        Nachteilsausgleich an Schweizer Hochschulen
        </h1>
        <p className={cn(hfTypography.paragraphRegular, "mt-4 text-stone-600")}>
        Interaktiver Webprototyp zur Simulation des Nachteilsausgleichsprozesses an Schweizer Hochschulen. Wählen Sie Ihre Rolle, um fortzufahren.
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
            <h2 className={cn(hfTypography.h4, "text-stone-900")}>Studierenden Portal</h2>
            <p className={cn(hfTypography.paragraphSmall, "text-stone-600")}>
            Als Studierende: Beratung und Empfehlung durchlaufen, Antrag stellen, Status verfolgen, Anpassungen vornehmen und den Entscheid einsehen.
            </p>
          </div>
          <Button asChild className="w-full rounded-full sm:w-auto">
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
            Als Fachperson oder Entscheidungsinstanz: Anträge bearbeiten, Beratungsgespräche dokumentieren, Empfehlungsschreiben verfassen sowie Reviews und Entscheide im Prozess abbilden.
            </p>
          </div>
          <Button asChild className="w-full rounded-full sm:w-auto">
            <Link href="/staff/login">Zum Workspace anmelden</Link>
          </Button>
        </section>
      </div>

      <p className={cn(hfTypography.paragraphMini, "mt-10 max-w-2xl text-stone-500")}>
      Für zuverlässige Ergebnisse: Jede Rolle in einem separaten Browser öffnen (z.B. Firefox für R1, Chrome für R2) — und pro angemeldetem Account nur einen Tab verwenden.
      </p>
    </PrototypeEntryShell>
  );
}
