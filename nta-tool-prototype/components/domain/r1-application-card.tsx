import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { R1ApplicationProgress } from "@/components/domain/r1-application-progress";
import { R1ApplicationStatusPill } from "@/components/domain/r1-application-status-pill";
import { deriveCanonicalApplicationState } from "@/lib/application-status";
import { getR1CardVisualConfig } from "@/lib/r1-application-card-visual";
import {
  r1ApplicationDateMeta,
  r1ApplicationDisplayTitle,
} from "@/lib/r1-application-list-meta";
import { hfTypography } from "@/lib/design-tokens/typography";
import type { ApplicationRow } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

type R1ApplicationCardProps = {
  application: ApplicationRow;
  className?: string;
};

/** Figma `5856:21926` — R1-Antragkarte nach Status. */
export function R1ApplicationCard({ application, className }: R1ApplicationCardProps) {
  const canonicalState = deriveCanonicalApplicationState(application);
  const visual = getR1CardVisualConfig(canonicalState);
  const dateMeta = r1ApplicationDateMeta(application);
  const href = `/portal/antragserstellung?applicationId=${application.id}`;

  const cardLabel = `${visual.title}: ${r1ApplicationDisplayTitle(application)}`;

  return (
    <Link
      href={href}
      aria-label={cardLabel}
      className={cn(
        "group flex h-full min-h-[352px] w-full min-w-0 flex-col gap-4 rounded-xl p-6",
        "transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        visual.shellClass,
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className={cn(hfTypography.paragraphLargeMedium, visual.titleClass)}>
          {visual.title}
        </p>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity group-hover:opacity-90"
          aria-hidden
        >
          <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between rounded-xl bg-background px-6 pb-12 pt-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
              {dateMeta.prefix} {dateMeta.value}
            </p>
            <R1ApplicationStatusPill application={application} />
          </div>
          <p className={cn(hfTypography.paragraphMedium, "text-foreground")}>
            {r1ApplicationDisplayTitle(application)}
          </p>
        </div>

        <R1ApplicationProgress steps={visual.progressSteps} />
      </div>
    </Link>
  );
}
