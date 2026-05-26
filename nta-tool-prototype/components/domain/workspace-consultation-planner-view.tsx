"use client";

import { hfTypography } from "@/lib/design-tokens/typography";
import type { UserRole } from "@/lib/auth";
import { workspaceConsultationPlannerHasContent } from "@/lib/workspace-nav-access";
import { cn } from "@/lib/utils";

type WorkspaceConsultationPlannerViewProps = {
  workspaceRole: UserRole;
};

/**
 * `/workspace?view=terminplaner` — R2 placeholder (empty white panel).
 * Future combined R2+R4 role: replace with scheduling UI when implemented.
 */
export function WorkspaceConsultationPlannerView({
  workspaceRole,
}: WorkspaceConsultationPlannerViewProps) {
  const hasContent = workspaceConsultationPlannerHasContent(workspaceRole);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col pb-6">
      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col rounded-xl bg-stone-50 p-6",
          hasContent ? "gap-6" : "gap-0",
        )}
        aria-label="Beratungen planen"
      >
        {hasContent ? null : (
          <h1 className={cn(hfTypography.paragraphLargeMedium, "sr-only")}>
            Beratungen planen
          </h1>
        )}
      </section>
    </div>
  );
}
