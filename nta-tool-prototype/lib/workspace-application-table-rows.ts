import { workspaceApplicationListNumber } from "@/components/domain/application-review-blocks";
import {
  getApplicationStatusMeta,
  type StatusAudience,
} from "@/lib/application-status";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssignee,
} from "@/lib/application-assignee";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

export type WorkspaceApplicationTableRow = {
  application: WorkspaceApplication;
  applicantName: string;
  applicantInitials: string;
  studiengang: string;
  ref: string;
  date: string;
  statusLabel: string;
  statusClass: string;
  assignee: string;
};

export function statusAudienceForWorkspaceRole(role: UserRole): StatusAudience {
  return role === "R4" ? "R4" : "R2";
}

function formatApplicationTableDate(application: WorkspaceApplication): string {
  const submitted = formatReviewSubmittedAt(application.data);
  if (submitted) return submitted;
  return new Date(application.updated_at).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function applicantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function buildWorkspaceApplicationTableRows(
  applications: WorkspaceApplication[],
  options: {
    reviewerDisplayName: string;
    workspaceRole: UserRole;
  },
): WorkspaceApplicationTableRow[] {
  const { reviewerDisplayName, workspaceRole } = options;
  const statusAudience = statusAudienceForWorkspaceRole(workspaceRole);

  return applications.map((application) => {
    const statusMeta = getApplicationStatusMeta(application, statusAudience);
    const canonicalState = statusMeta.canonicalState;
    const applicantName = resolveApplicantDisplayName(application);
    const assignee = resolveApplicationAssignee({
      canonicalState,
      applicantDisplayName: applicantName,
      r2ReviewerDisplayName:
        application.data.recommendation?.releasedBy?.trim() || reviewerDisplayName,
      r4ReviewerDisplayName: reviewerDisplayName,
    });

    return {
      application,
      applicantName,
      applicantInitials: applicantInitials(applicantName),
      studiengang: application.data.personalData?.studiengang?.trim() || "—",
      ref: workspaceApplicationListNumber(application),
      date: formatApplicationTableDate(application),
      statusLabel: statusMeta.label,
      statusClass: statusMeta.className,
      assignee: assignee.displayName,
    };
  });
}
