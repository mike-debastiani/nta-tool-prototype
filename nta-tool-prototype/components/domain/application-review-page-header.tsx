"use client";

import { EllipsisVertical, Share2 } from "lucide-react";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type ApplicationReviewPageHeaderProps = {
  submittedAtLabel: string | null;
  title?: string;
  /** Figma Verfügung-Screen: Teilen-Button statt «Weitere Aktionen». */
  trailingAction?: "more" | "share";
  onMoreActionsClick?: () => void;
  onShareClick?: () => void;
  className?: string;
};

/** Figma Review-Antrag — Titel, «Eingereicht am», Aktions-Button (R1 Portal + R2 Workspace). */
export function ApplicationReviewPageHeader({
  submittedAtLabel,
  title = "Antrag auf Nachteilsausgleich",
  trailingAction = "more",
  onMoreActionsClick,
  onShareClick,
  className,
}: ApplicationReviewPageHeaderProps) {
  const submittedClass = cn(hfTypography.paragraphSmall, "text-muted-foreground");

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-3">
        <h1 className={hfTypography.h3}>{title}</h1>
        {submittedAtLabel ? (
          <p className={submittedClass}>Eingereicht am {submittedAtLabel}</p>
        ) : null}
      </div>
      {trailingAction === "share" ? (
        <button
          type="button"
          onClick={onShareClick}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
          aria-label="Verfügung teilen"
        >
          <Share2 className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={onMoreActionsClick}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
          aria-label="Weitere Aktionen"
        >
          <EllipsisVertical className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </div>
  );
}
