"use client";

import { useMemo } from "react";

import { ApplicationReviewDetailSidebar } from "@/components/domain/application-review-detail-sidebar";
import { ApplicationReviewPageHeader } from "@/components/domain/application-review-page-header";
import { ApplicationStatusCallout } from "@/components/domain/application-status-callout";
import { useRegisterDashboardDetailPanel } from "@/components/domain/dashboard-detail-panel-context";
import { useDashboardScrollRoot } from "@/components/domain/dashboard-main-panel-scroll-context";
import {
  R4VerfuegungDocument,
  type R4VerfuegungVariant,
} from "@/components/domain/r4-verfuegung-document";
import { R4VerfuegungRejectedBlocks } from "@/components/domain/r4-verfuegung-rejected-blocks";
import {
  resolveApplicationAssignee,
  resolveApplicationAssigneeForWorkspace,
  WORKSPACE_PROTOTYPE_R2_REVIEWER_NAME,
  WORKSPACE_PROTOTYPE_R4_REVIEWER_NAME,
} from "@/lib/application-assignee";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { getApplicationStatusMeta } from "@/lib/application-status";
import {
  applicationReviewScrollAreaClass,
  applicationReviewSectionGapClass,
} from "@/lib/design-tokens/application-scroll";
import {
  getIssuedVerfuegungCallout,
  type IssuedVerfuegungCalloutAudience,
} from "@/lib/issued-verfuegung-callouts";
import { mergeR4DecisionReview } from "@/lib/r4-decision-state";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

type ApplicationIssuedVerfuegungViewProps = {
  application: WorkspaceApplication;
  calloutAudience: IssuedVerfuegungCalloutAudience;
  /** Workspace: Assignee-Auflösung (R2/R4/R2R4). */
  workspaceRole?: UserRole;
  reviewerDisplayName?: string;
  /** Portal R1: Anzeigename des Antragstellers für Assignee. */
  applicantDisplayName?: string;
};

/**
 * Read-only Verfügungsansicht nach Entscheid (bewilligt/abgelehnt).
 * Gleicher Screen wie R4 ausgestellte Verfügung; Callouts je nach `calloutAudience`.
 */
export function ApplicationIssuedVerfuegungView({
  application,
  calloutAudience,
  workspaceRole,
  reviewerDisplayName,
  applicantDisplayName,
}: ApplicationIssuedVerfuegungViewProps) {
  const statusAudience =
    calloutAudience === "R1" ? "R1" : calloutAudience === "R4" ? "R4" : "R2";
  const statusMeta = getApplicationStatusMeta(application, statusAudience);
  const isRejected = statusMeta.canonicalState === "rejected";
  const verfuegungVariant: R4VerfuegungVariant = isRejected ? "rejected" : "approved";
  const callout = getIssuedVerfuegungCallout(calloutAudience, verfuegungVariant);
  const CalloutIcon = callout.icon;

  const review = useMemo(() => mergeR4DecisionReview(application.data), [application.data]);
  const submittedAtLabel = formatReviewSubmittedAt(application.data);

  const assignee = useMemo(() => {
    if (workspaceRole != null && reviewerDisplayName != null) {
      return resolveApplicationAssigneeForWorkspace(application, {
        workspaceRole,
        reviewerDisplayName,
      });
    }
    return resolveApplicationAssignee({
      canonicalState: statusMeta.canonicalState,
      applicantDisplayName: applicantDisplayName ?? "Antragsteller",
      r2ReviewerDisplayName:
        application.data.consultation?.advisor?.trim()
        || WORKSPACE_PROTOTYPE_R2_REVIEWER_NAME,
      r4ReviewerDisplayName: WORKSPACE_PROTOTYPE_R4_REVIEWER_NAME,
    });
  }, [
    application,
    applicantDisplayName,
    reviewerDisplayName,
    statusMeta.canonicalState,
    workspaceRole,
  ]);

  const detailPanelSignature = useMemo(
    () =>
      [
        application.id,
        application.updated_at,
        statusMeta.canonicalState,
        calloutAudience,
        verfuegungVariant,
      ].join("\u001e"),
    [
      application.id,
      application.updated_at,
      statusMeta.canonicalState,
      calloutAudience,
      verfuegungVariant,
    ],
  );

  const scrollRootRef = useDashboardScrollRoot<HTMLDivElement>();

  useRegisterDashboardDetailPanel(
    detailPanelSignature,
    () => (
      <ApplicationReviewDetailSidebar
        application={application}
        statusMeta={statusMeta}
        assignee={assignee}
        adjustmentComposer={null}
        savedReviewComments={[]}
        showCommentsSection={false}
        secondarySection="r4_related_documents"
      />
    ),
  );

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden">
      <div
        ref={scrollRootRef}
        className={cn(
          applicationReviewScrollAreaClass,
          "flex flex-col",
          applicationReviewSectionGapClass,
        )}
      >
        <div className="flex shrink-0 flex-col gap-6">
          <ApplicationReviewPageHeader
            submittedAtLabel={submittedAtLabel}
            title="Verfügung zum Nachteilsausgleich"
            trailingAction="share"
          />
          <ApplicationStatusCallout badgeClassName={statusMeta.className} icon={CalloutIcon}>
            {callout.text}
          </ApplicationStatusCallout>
        </div>

        <div className="flex shrink-0 flex-col gap-6">
          <R4VerfuegungDocument
            application={application}
            review={review}
            variant={verfuegungVariant}
          />
          {verfuegungVariant === "rejected" ? (
            <R4VerfuegungRejectedBlocks application={application} review={review} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
