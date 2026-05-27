"use client";

import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

/** `/workspace?view=auswerten` — Platzhalter ohne Inhalt (Figma folgt). */
export function WorkspaceEvaluateView() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col pb-6">
      <section
        className="flex min-h-0 flex-1 flex-col gap-0 rounded-xl bg-stone-50 p-6"
        aria-label="Auswerten"
      >
        <h1 className={cn(hfTypography.paragraphLargeMedium, "sr-only")}>Auswerten</h1>
      </section>
    </div>
  );
}
