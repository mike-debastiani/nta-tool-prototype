"use client";

import { useMemo } from "react";

import { WorkspaceApplicationsTable } from "@/components/domain/workspace-applications-table";
import { buildWorkspaceApplicationTableRows } from "@/lib/workspace-application-table-rows";
import { filterMyTasksApplications } from "@/lib/workspace-assigned-tasks-stats";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";

type WorkspaceMyTasksViewProps = {
  reviewerDisplayName: string;
  applications: WorkspaceApplication[];
  workspaceRole: UserRole;
  onSelectApplication: (applicationId: string) => void;
};

/** Meine Aufgaben (`/workspace?view=aufgaben`) — nur zugewiesene Anträge als Tabelle. */
export function WorkspaceMyTasksView({
  reviewerDisplayName,
  applications,
  workspaceRole,
  onSelectApplication,
}: WorkspaceMyTasksViewProps) {
  const assignedApplications = useMemo(
    () =>
      filterMyTasksApplications(applications, {
        reviewerDisplayName,
        workspaceRole,
      }),
    [applications, reviewerDisplayName, workspaceRole],
  );

  const tableRows = useMemo(
    () =>
      buildWorkspaceApplicationTableRows(assignedApplications, {
        reviewerDisplayName,
        workspaceRole,
      }),
    [assignedApplications, reviewerDisplayName, workspaceRole],
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col pb-6">
      <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-stone-50 p-6">
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <WorkspaceApplicationsTable
            rows={tableRows}
            onSelectApplication={onSelectApplication}
            emptyMessage="Keine dir zugewiesenen Aufgaben."
          />
        </div>
      </section>
    </div>
  );
}
