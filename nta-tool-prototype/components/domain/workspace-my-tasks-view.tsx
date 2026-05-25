"use client";

import { useMemo } from "react";

import { useWorkspaceApplicationsTableState } from "@/components/domain/use-workspace-applications-table-state";
import { WorkspaceApplicationsTable } from "@/components/domain/workspace-applications-table";
import { WorkspaceApplicationsTableToolbar } from "@/components/domain/workspace-applications-table-toolbar";
import { hfTypography } from "@/lib/design-tokens/typography";
import { filterMyTasksApplications } from "@/lib/workspace-assigned-tasks-stats";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { cn } from "@/lib/utils";

type WorkspaceMyTasksViewProps = {
  reviewerDisplayName: string;
  applications: WorkspaceApplication[];
  workspaceRole: UserRole;
  onSelectApplication: (applicationId: string) => void;
};

/** Meine Aufgaben (`/workspace?view=aufgaben`) — zugewiesene Anträge mit Suche, Filter und Sortierung. */
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

  const tableState = useWorkspaceApplicationsTableState({
    applications,
    reviewerDisplayName,
    workspaceRole,
    prefilteredApplications: assignedApplications,
  });

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col pb-6">
      <section className="flex min-h-0 flex-1 flex-col gap-6 rounded-xl bg-stone-50 p-6">
        <h1 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          Meine Aufgaben
        </h1>

        <WorkspaceApplicationsTableToolbar
          searchQuery={tableState.searchQuery}
          onSearchQueryChange={tableState.setSearchQuery}
          columnFilters={tableState.columnFilters}
          filterOptions={tableState.filterOptions}
          reviewerDisplayName={reviewerDisplayName}
          onColumnFiltersChange={tableState.setColumnFilters}
          onResetColumnFilters={tableState.resetColumnFilters}
          filteredCount={tableState.filteredCount}
          totalCount={tableState.totalCount}
        />

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <WorkspaceApplicationsTable
            rows={tableState.displayedRows}
            onSelectApplication={onSelectApplication}
            sort={tableState.sort}
            onSortChange={tableState.setSort}
            totalRowCount={tableState.baseRows.length}
            emptyMessage="Keine dir zugewiesenen Aufgaben."
          />
        </div>
      </section>
    </div>
  );
}
