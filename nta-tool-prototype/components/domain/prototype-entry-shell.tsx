import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { AvalisLogo } from "@/components/icons/avalis-logo";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type PrototypeEntryShellProps = {
  children: ReactNode;
  /** Schmaler Inhalt (Login); Standard für die Startseite. */
  narrow?: boolean;
  backHref?: string;
  backLabel?: string;
};

export function PrototypeEntryShell({
  children,
  narrow = false,
  backHref,
  backLabel = "Zurück zur Übersicht",
}: PrototypeEntryShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-stone-100">
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-6 py-10 sm:py-14",
          narrow ? "max-w-md justify-center" : "max-w-3xl justify-center",
        )}
      >
        {backHref ? (
          <Link
            href={backHref}
            className={cn(
              "mb-8 inline-flex w-fit items-center gap-2 text-stone-600 transition-colors hover:text-stone-900",
              hfTypography.paragraphSmall,
            )}
          >
            <ArrowLeft className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {backLabel}
          </Link>
        ) : null}

        <div className="mb-10 flex items-center gap-3">
          <AvalisLogo />
          <span className={cn(hfTypography.h4, "text-stone-900")}>avalis</span>
        </div>

        {children}
      </div>
    </main>
  );
}
