import { workspaceApplicationListNumber } from "@/components/domain/application-review-blocks";
import { getApplicationStatusMeta } from "@/lib/application-status";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssigneeForWorkspace,
  type ApplicationAssignee,
} from "@/lib/application-assignee";
import { getStudyProgramMeta } from "@/lib/uzh-studiengaenge";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { statusAudienceForWorkspaceApplication } from "@/lib/workspace-role";

export type WorkspaceApplicationTableRow = {
  application: WorkspaceApplication;
  applicantName: string;
  studiengang: string;
  /** Fakultäts-Kürzel (MNF, PhF, …) für Tabellen-Spalte und Filter. */
  fakultaet: string;
  /** Vollständiger Fakultätsname (Tooltip, Suche). */
  fakultaetFullName?: string;
  ref: string;
  date: string;
  /** Für Sortierung (Einreichung oder `updated_at`). */
  dateSortValue: number;
  statusLabel: string;
  statusClass: string;
  assignee: ApplicationAssignee;
};

function formatApplicationTableDate(application: WorkspaceApplication): string {
  const submitted = formatReviewSubmittedAt(application.data);
  if (submitted) return submitted;
  return new Date(application.updated_at).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildWorkspaceApplicationTableRows(
  applications: WorkspaceApplication[],
  options: {
    reviewerDisplayName: string;
    workspaceRole: UserRole;
  },
): WorkspaceApplicationTableRow[] {
  const { reviewerDisplayName, workspaceRole } = options;

  return applications.map((application) => {
    const statusMeta = getApplicationStatusMeta(
      application,
      statusAudienceForWorkspaceApplication(workspaceRole, application),
    );
    const applicantName = resolveApplicantDisplayName(application);
    const studiengang = application.data.personalData?.studiengang?.trim() || "—";
    const assignee = resolveApplicationAssigneeForWorkspace(application, {
      reviewerDisplayName,
      workspaceRole,
    });
    const programMeta = getStudyProgramMeta(studiengang === "—" ? undefined : studiengang);

    const submittedAt = application.data?.submittedAt;
    const dateSortValue = submittedAt
      ? new Date(submittedAt).getTime()
      : new Date(application.updated_at).getTime();

    return {
      application,
      applicantName,
      studiengang,
      fakultaet: programMeta?.facultyShortCode ?? "—",
      fakultaetFullName: programMeta?.facultyName,
      ref: workspaceApplicationListNumber(application),
      date: formatApplicationTableDate(application),
      dateSortValue: Number.isFinite(dateSortValue) ? dateSortValue : 0,
      statusLabel: statusMeta.label,
      statusClass: statusMeta.className,
      assignee,
    };
  });
}
