"use client";

import type { ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type Variant = "card" | "plain" | "r1";

type RecommendationReleasedAccordionProps = {
  html: string;
  releasedAt?: string;
  authorDisplayName: string;
  variant?: Variant;
  anchorId?: string;
  className?: string;
  /** Nur `variant="r1"`: z. B. Kenntnisnahme-Checkbox (Figma 5247:5575). */
  children?: ReactNode;
  /** Workspace Review/R4: öffnet Empfehlung im Dokument-Tab (Core-Layout). */
  applicationId?: string;
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
 * Visueller «In neuem Tab öffnen»-Indikator. Bewusst KEIN `<button>`, da diese Meta-Zeile
 * im `AccordionTrigger` (selbst ein `<button>`) liegt — verschachtelte Buttons sind ungültiges
 * HTML und lösen Hydration-Fehler aus.
 */
function OpenInDocumentTabButton({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      title="Empfehlungsschreiben in neuem Tab öffnen"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      <ExternalLink className="size-4" aria-hidden />
    </span>
  );
}

/** Freigabe-Meta (HF 5247:5570) — R1, R2, R4 einheitlich. */
function ReleasedMeta({
  releasedAtLabel,
  authorDisplayName,
  initials,
  applicationId,
}: {
  releasedAtLabel: string | null;
  authorDisplayName: string;
  initials: string;
  applicationId?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2" data-node-id="5253:5665">
      {applicationId ? (
        <OpenInDocumentTabButton />
      ) : null}
      <p className="shrink-0 whitespace-nowrap text-hf-paragraph-mini-medium text-muted-foreground">
        {releasedAtLabel
          ? `Freigegeben am ${releasedAtLabel} durch`
          : "Freigegeben durch"}
      </p>
      <span
        className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-stone-150 text-[10.5px] font-semibold leading-[15px] text-foreground"
        title={authorDisplayName}
        aria-label={`Freigegeben durch ${authorDisplayName}`}
      >
        {initials}
      </span>
      <ChevronDown
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </div>
  );
}

/**
 * Gemeinsame Darstellung eines freigegebenen Empfehlungsschreibens als Accordion.
 *
 * - `variant="card"`: Review-Blocks mit Card-Hülle (R2/R4); Meta wie R1.
 * - `variant="plain"`: eingebettet ohne HF-Header (Legacy).
 * - `variant="r1"`: R1 Step 3 / HF 5247:5570 — Titel, Freigabe-Meta, Content + `children`.
 */
export function RecommendationReleasedAccordion({
  html,
  releasedAt,
  authorDisplayName,
  variant = "card",
  anchorId,
  className,
  children,
  applicationId,
}: RecommendationReleasedAccordionProps) {
  const releasedAtLabel = formatReleasedAt(releasedAt);
  const initials = getAuthorInitials(authorDisplayName);

  if (variant === "r1") {
    return (
      <div
        id={anchorId}
        className={cn("flex w-full flex-col gap-3", className)}
        data-node-id="5247:5571"
      >
        <Accordion type="single" collapsible defaultValue="recommendation">
          <AccordionItem value="recommendation" className="border-b-0">
            <AccordionTrigger
              className={cn(
                "group flex w-full items-start justify-between gap-3 rounded-none px-0 py-0",
                "text-left hover:no-underline",
                "[&>svg:last-child]:hidden",
              )}
              data-node-id="5253:5631"
            >
              <h2 className="shrink-0 whitespace-nowrap text-hf-paragraph-large-medium text-stone-900">
                Empfehlungsschreiben
              </h2>
              <ReleasedMeta
                releasedAtLabel={releasedAtLabel}
                authorDisplayName={authorDisplayName}
                initials={initials}
                applicationId={applicationId}
              />
            </AccordionTrigger>
            <AccordionContent className="px-0 pt-4 pb-0">
              <div
                className="flex w-full flex-col items-start gap-5"
                data-node-id="5247:5573"
              >
                <article
                  className="tiptap-content w-full text-hf-paragraph-small text-stone-900"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                {children}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  const content = (
    <Accordion type="single" collapsible defaultValue="recommendation">
      <AccordionItem value="recommendation" className="border-b-0">
        <AccordionTrigger
          className={cn(
            "group hover:no-underline [&>svg:last-child]:hidden",
            "py-5",
            variant === "card" ? "px-6" : "px-0",
          )}
        >
          <div className="flex flex-1 items-center justify-between gap-3 pr-2">
            <h2 className="text-lg font-medium text-foreground">
              Empfehlungsschreiben der Fachstelle
            </h2>
            <ReleasedMeta
              releasedAtLabel={releasedAtLabel}
              authorDisplayName={authorDisplayName}
              initials={initials}
              applicationId={applicationId}
            />
          </div>
        </AccordionTrigger>
        <AccordionContent
          className={cn(variant === "card" ? "px-6 pb-5" : "px-0 pb-0")}
        >
          <article
            className="tiptap-content text-sm leading-6 text-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
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
        "scroll-mt-6 overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      {content}
    </section>
  );
}
