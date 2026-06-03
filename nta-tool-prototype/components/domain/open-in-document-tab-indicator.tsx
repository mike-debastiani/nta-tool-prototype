import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Visueller «In neuem Tab öffnen»-Indikator (keine Aktion — nur Icon + Pill-Hover).
 * Gleiches Verhalten wie im Empfehlungsschreiben-Block (HF Accordion-Header).
 */
export function OpenInDocumentTabIndicator({
  className,
  title = "In neuem Tab öffnen",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[9999px] text-muted-foreground transition-colors hover:bg-stone-100 hover:text-foreground",
        className,
      )}
      aria-hidden
    >
      <ExternalLink className="size-4" aria-hidden />
    </span>
  );
}
