"use client";

import { CheckCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type Variant = "card" | "plain";

type RecommendationReleasedAccordionProps = {
  html: string;
  releasedAt?: string;
  authorDisplayName: string;
  variant?: Variant;
  anchorId?: string;
  className?: string;
};

function getAuthorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatReleasedAt(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Gemeinsame Darstellung eines freigegebenen Empfehlungsschreibens als Accordion.
 *
 * - `variant="card"` (default): mit Card-Hülle (border + shadow-xs), passend zu
 *   den Review-Blocks. Titel sitzt in einer Headerzeile mit gleicher Hierarchie
 *   wie `ReviewBlockCard` (`text-lg font-medium`).
 * - `variant="plain"`: ohne äussere Card-Hülle, für eingebettete Verwendung in
 *   der R1-Antragstellung.
 */
export function RecommendationReleasedAccordion({
  html,
  releasedAt,
  authorDisplayName,
  variant = "card",
  anchorId,
  className,
}: RecommendationReleasedAccordionProps) {
  const releasedAtLabel = formatReleasedAt(releasedAt);
  const initials = getAuthorInitials(authorDisplayName);

  const content = (
    <Accordion type="single" collapsible defaultValue="recommendation">
      <AccordionItem value="recommendation" className="border-b-0">
        <AccordionTrigger
          className={cn(
            "py-5",
            variant === "card" ? "px-6" : "px-0",
          )}
        >
          <div className="flex flex-1 items-center justify-between gap-3 pr-2">
            <h2 className="text-lg font-medium text-foreground">
              Empfehlungsschreiben der Fachstelle
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700">
              <CheckCheck className="size-3.5" aria-hidden />
              Freigegeben
              {releasedAtLabel ? ` · ${releasedAtLabel}` : ""}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent
          className={cn(variant === "card" ? "px-6 pb-5" : "px-0 pb-0")}
        >
          <article
            className="tiptap-content text-sm leading-6 text-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {authorDisplayName}
              </p>
              <p className="text-xs text-muted-foreground">
                Verfasst durch die Fachstelle
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  if (variant === "plain") {
    return (
      <div className={className} id={anchorId}>
        {content}
      </div>
    );
  }

  return (
    <section
      id={anchorId}
      className={cn(
        "scroll-mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-xs",
        className,
      )}
    >
      {content}
    </section>
  );
}
