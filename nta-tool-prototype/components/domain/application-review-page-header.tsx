"use client";

import { EllipsisVertical } from "lucide-react";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

type ApplicationReviewPageHeaderProps = {
  submittedAtLabel: string | null;
  onMoreActionsClick?: () => void;
  className?: string;
};

/** Figma Review-Antrag — Titel, «Eingereicht am», Options-Button (R1 Portal + R2 Workspace). */
export function ApplicationReviewPageHeader({
  submittedAtLabel,
  onMoreActionsClick,
  className,
}: ApplicationReviewPageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-3">
        <h1 className={hfTypography.h3}>Antrag auf Nachteilsausgleich</h1>
        {submittedAtLabel ? (
          <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
            Eingereicht am {submittedAtLabel}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onMoreActionsClick}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-150 text-foreground-alt transition-colors hover:bg-stone-200/80"
        aria-label="Weitere Aktionen"
      >
        <EllipsisVertical className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
