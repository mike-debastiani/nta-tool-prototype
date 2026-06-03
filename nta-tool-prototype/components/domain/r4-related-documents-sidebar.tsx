"use client";

import { useMemo } from "react";
import { EllipsisVertical, FileText } from "lucide-react";

import { OpenInDocumentTabIndicator } from "@/components/domain/open-in-document-tab-indicator";
import { APPLICATION_CONTENT_PANEL_CARD_CLASS } from "@/lib/design-tokens/application-content-panel";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

type RelatedDocumentItem = {
  id: string;
  title: string;
  subtitle: string;
};

/** Figma `6531:26481` — eine Dezimalstelle wie im Beispiel (z. B. «2.9 MB»). */
function formatDocumentFileSize(sizeInBytes: number): string {
  if (!sizeInBytes || Number.isNaN(sizeInBytes)) return "—";
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecommendationSubtitle(releasedAt?: string): string {
  if (!releasedAt) return "Empfehlungsschreiben der Fachstelle";
  try {
    return `Freigegeben am ${new Date(releasedAt).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`;
  } catch {
    return "Empfehlungsschreiben der Fachstelle";
  }
}

function buildRelatedDocuments(application: WorkspaceApplication): RelatedDocumentItem[] {
  const items: RelatedDocumentItem[] = [];

  for (const file of application.data.attestFiles ?? []) {
    const name = file.name?.trim();
    if (!name) continue;
    items.push({
      id: file.id ?? `attest:${name}`,
      title: name,
      subtitle: formatDocumentFileSize(file.size ?? 0),
    });
  }

  if (application.data.recommendation?.releasedHtml?.trim()) {
    items.push({
      id: "recommendation",
      title: "Empfehlungsschreiben",
      subtitle: formatRecommendationSubtitle(application.data.recommendation.releasedAt),
    });
  }

  return items;
}

/** Einzelnes Dokument — Figma Item `6531:26487` (Icon 24px, External-Link 16px). */
function RelatedDocumentRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="flex w-full items-center gap-4 rounded-lg border border-border p-4"
      data-node-id="6531:26487"
    >
      <FileText
        className="size-6 shrink-0 text-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col text-hf-paragraph-small">
        <p className={cn(hfTypography.paragraphSmallMedium, "truncate text-foreground")}>
          {title}
        </p>
        <p className={cn(hfTypography.paragraphSmall, "truncate text-muted-foreground")}>
          {subtitle}
        </p>
      </div>
      <OpenInDocumentTabIndicator title="Dokument im Antrag enthalten" />
    </div>
  );
}

/**
 * Sidebar-Karte «Zugehörige Dokumente» (Figma `6531:26481`) — Atteste + Empfehlungsschreiben.
 * Das External-Link-Icon ist nur ein visueller Indikator (kein Öffnen in neuem Tab).
 */
export function R4RelatedDocumentsSidebar({
  application,
  className,
}: {
  application: WorkspaceApplication;
  className?: string;
}) {
  const documents = useMemo(() => buildRelatedDocuments(application), [application]);

  return (
    <section
      className={cn(
        APPLICATION_CONTENT_PANEL_CARD_CLASS,
        "flex w-full shrink-0 flex-col gap-4 p-4",
        className,
      )}
      data-node-id="6531:26482"
      aria-labelledby="r4-related-documents-heading"
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id="r4-related-documents-heading"
          className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}
        >
          Zugehörige Dokumente
        </h3>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
          aria-label="Weitere Optionen"
        >
          <EllipsisVertical className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {documents.length === 0 ? (
        <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
          Keine Dokumente hinterlegt.
        </p>
      ) : (
        <ul className="flex w-full flex-col gap-4">
          {documents.map((doc) => (
            <li key={doc.id}>
              <RelatedDocumentRow title={doc.title} subtitle={doc.subtitle} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
