"use client";

import { useEffect, useMemo, useRef } from "react";

import { useWorkspaceApplicationsTableState } from "@/components/domain/use-workspace-applications-table-state";
import { WorkspaceApplicationsTable } from "@/components/domain/workspace-applications-table";
import { WorkspaceApplicationsTableToolbar } from "@/components/domain/workspace-applications-table-toolbar";
import {
  getStatusLabelForAudience,
  type CanonicalApplicationState,
} from "@/lib/application-status";
import { hfTypography } from "@/lib/design-tokens/typography";
import type { AssignedTaskBucketId } from "@/lib/workspace-assigned-tasks-stats";
import { filterMyTasksApplications } from "@/lib/workspace-assigned-tasks-stats";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { isCombinedR2R4Role } from "@/lib/workspace-role";
import { cn } from "@/lib/utils";

type WorkspaceMyTasksViewProps = {
  reviewerDisplayName: string;
  applications: WorkspaceApplication[];
  workspaceRole: UserRole;
  onSelectApplication: (applicationId: string) => void;
  initialBucketFilter?: AssignedTaskBucketId | null;
};

/** Meine Aufgaben (`/workspace?view=aufgaben`) — zugewiesene Anträge mit Suche, Filter und Sortierung. */
export function WorkspaceMyTasksView({
  reviewerDisplayName,
  applications,
  workspaceRole,
  onSelectApplication,
  initialBucketFilter = null,
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
  const appliedInitialBucketRef = useRef<AssignedTaskBucketId | null>(null);

  const initialStatusLabelFilter = useMemo(() => {
    if (!initialBucketFilter) return null;

    const stateByBucket: Record<AssignedTaskBucketId, CanonicalApplicationState> = {
      beratungen: "consultation_recommendation",
      reviews: "in_review",
      entscheidungen: "in_decision",
    };

    const canonicalState = stateByBucket[initialBucketFilter];
    const audience =
      initialBucketFilter === "entscheidungen" && isCombinedR2R4Role(workspaceRole)
        ? "R4"
        : workspaceRole === "R4" || workspaceRole === "R3"
          ? "R4"
          : "R2";
    return getStatusLabelForAudience(canonicalState, audience);
  }, [initialBucketFilter, workspaceRole]);

  useEffect(() => {
    if (!initialStatusLabelFilter) {
      appliedInitialBucketRef.current = null;
      return;
    }
    if (appliedInitialBucketRef.current === initialBucketFilter) {
      return;
    }

    const current = tableState.columnFilters.statusLabels;
    if (current.length === 1 && current[0] === initialStatusLabelFilter) {
      appliedInitialBucketRef.current = initialBucketFilter;
      return;
    }

    tableState.setColumnFilters((prev) => ({
      ...prev,
      statusLabels: [initialStatusLabelFilter],
    }));
    appliedInitialBucketRef.current = initialBucketFilter;
  }, [
    initialBucketFilter,
    initialStatusLabelFilter,
    tableState.columnFilters.statusLabels,
    tableState.setColumnFilters,
  ]);

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

        <div className="min-h-0 flex-1 overflow-visible">
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
