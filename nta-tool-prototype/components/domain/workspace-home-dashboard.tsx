"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import { AssignedTasksSummaryCard } from "@/components/domain/assigned-tasks-summary-card";
import { ConsultationsThisWeekSummaryCard } from "@/components/domain/consultations-this-week-summary-card";
import {
  OpenApplicationsSummaryCard,
  type ApplicationsChartBucketId,
} from "@/components/domain/open-applications-summary-card";
import { useWorkspaceApplicationsTableState } from "@/components/domain/use-workspace-applications-table-state";
import { WorkspaceApplicationsTable } from "@/components/domain/workspace-applications-table";
import { WorkspaceApplicationsTableToolbar } from "@/components/domain/workspace-applications-table-toolbar";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  WORKSPACE_HOME_KPI_CARD_CLASS,
  WORKSPACE_HOME_KPI_ROW_GAP_CLASS,
  WORKSPACE_HOME_R4_OPEN_CARD_CLASS,
  WORKSPACE_HOME_R4_TASKS_CARD_CLASS,
  WORKSPACE_HOME_R2R4_ASSIGNED_TASKS_CARD_CLASS,
  WORKSPACE_HOME_TABLE_PANEL_TOGGLE_BUTTON_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
import { computeAllApplicationsStats } from "@/lib/workspace-all-applications-stats";
import {
  deriveCanonicalApplicationState,
  getStatusLabelForAudience,
  type CanonicalApplicationState,
} from "@/lib/application-status";
import { type UserRole } from "@/lib/auth";
import type { AssignedTaskBucketId } from "@/lib/workspace-assigned-tasks-stats";
import {
  isCombinedR2R4Role,
  usesR4OnlyHomeLayout,
} from "@/lib/workspace-role";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { computeAssignedTasksStats } from "@/lib/workspace-assigned-tasks-stats";
import { computeOpenApplicationsStats } from "@/lib/workspace-open-applications-stats";
import { EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS } from "@/lib/workspace-applications-table-controls";
import { cn } from "@/lib/utils";

type WorkspaceHomeDashboardProps = {
  reviewerDisplayName: string;
  applications: WorkspaceApplication[];
  workspaceRole: UserRole;
  onSelectApplication: (applicationId: string) => void;
};

function greetingName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "Kollegin";
  const first = trimmed.split(/\s+/)[0];
  return first ?? trimmed;
}

function greetingPhrase(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function formatHomeDate(d: Date): string {
  return d.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function TablePanelToggleButton({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={WORKSPACE_HOME_TABLE_PANEL_TOGGLE_BUTTON_CLASS}
      onClick={onToggle}
      aria-label={expanded ? "Tabelle verkleinern" : "Tabelle maximieren"}
      aria-expanded={expanded}
    >
      {expanded ? (
        <Minimize2 className="size-4" strokeWidth={1.75} aria-hidden />
      ) : (
        <Maximize2 className="size-4" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

export function WorkspaceHomeDashboard({
  reviewerDisplayName,
  applications,
  workspaceRole,
  onSelectApplication,
}: WorkspaceHomeDashboardProps) {
  const name = greetingName(reviewerDisplayName);
  const phrase = greetingPhrase();
  const todayLabel = formatHomeDate(new Date());
  const [isTableMaximized, setIsTableMaximized] = useState(false);
  const router = useRouter();
  const homeTableApplications = useMemo(
    () =>
      isCombinedR2R4Role(workspaceRole)
        ? applications.filter(
            (application) => deriveCanonicalApplicationState(application) !== "draft",
          )
        : applications,
    [applications, workspaceRole],
  );

  const tableState = useWorkspaceApplicationsTableState({
    applications: homeTableApplications,
    reviewerDisplayName,
    workspaceRole,
  });

  const isR4Home = usesR4OnlyHomeLayout(workspaceRole);
  const supportsTableExpand =
    workspaceRole === "R2" || workspaceRole === "R4" || isCombinedR2R4Role(workspaceRole);

  const maximizeApplicationsTable = useCallback(() => {
    if (!supportsTableExpand) return;
    tableState.setOpenAllFilter("open");
    setIsTableMaximized(true);
  }, [supportsTableExpand, tableState]);

  const openMyTasks = useCallback(() => {
    router.push("/workspace?view=aufgaben");
  }, [router]);

  const openMyTasksWithBucketFilter = useCallback(
    (bucketId: AssignedTaskBucketId) => {
      router.push(`/workspace?view=aufgaben&tasksBucket=${bucketId}`);
    },
    [router],
  );

  const openAppointmentPlanner = useCallback(() => {
    router.push("/workspace?view=terminplaner");
  }, [router]);

  const handleOpenApplicationsBucketClick = useCallback(
    (bucketId: ApplicationsChartBucketId) => {
      const stateByBucket: Record<ApplicationsChartBucketId, CanonicalApplicationState> = {
        in_review: "in_review",
        adjustment: "needs_adjustment",
        in_decision: "in_decision",
        approved: "approved",
        rejected: "rejected",
      };
      const canonicalState = stateByBucket[bucketId];
      const audience =
        bucketId === "in_decision" && isCombinedR2R4Role(workspaceRole)
          ? "R4"
          : workspaceRole === "R4"
            ? "R4"
            : "R2";
      const statusLabel = getStatusLabelForAudience(canonicalState, audience);
      if (!statusLabel) return;

      if (bucketId === "approved" || bucketId === "rejected") {
        tableState.setOpenAllFilter("all");
      }

      tableState.setColumnFilters((prev) => ({
        ...prev,
        statusLabels: [statusLabel],
      }));
    },
    [tableState, workspaceRole],
  );

  const resetApplicationsTableFilters = useCallback(() => {
    tableState.setColumnFilters(EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS);
    tableState.setOpenAllFilter(usesR4OnlyHomeLayout(workspaceRole) ? "all" : "open");
  }, [tableState, workspaceRole]);

  const openApplicationsStats = useMemo(
    () => computeOpenApplicationsStats(applications),
    [applications],
  );

  const allApplicationsStats = useMemo(
    () => computeAllApplicationsStats(applications),
    [applications],
  );

  const assignedTasksStats = useMemo(
    () =>
      computeAssignedTasksStats(applications, {
        reviewerDisplayName,
        workspaceRole,
      }),
    [applications, reviewerDisplayName, workspaceRole],
  );

  const kpiRow = (
    <div
      className={cn(
        "flex w-full min-w-0 items-stretch",
        WORKSPACE_HOME_KPI_ROW_GAP_CLASS,
      )}
    >
        {isR4Home ? (
          <>
            <OpenApplicationsSummaryCard
              stats={allApplicationsStats}
              title="Alle Anträge"
              totalAriaLabel={`${allApplicationsStats.total} Anträge gesamt`}
              allowedViews={["vertical", "horizontal"]}
              className={WORKSPACE_HOME_R4_OPEN_CARD_CLASS}
              onHeaderIconClick={maximizeApplicationsTable}
              headerIconAriaLabel="Anträge-Tabelle maximieren"
              onBucketClick={handleOpenApplicationsBucketClick}
              onTotalClick={resetApplicationsTableFilters}
            />
            <AssignedTasksSummaryCard
              buckets={assignedTasksStats.buckets}
              className={WORKSPACE_HOME_R4_TASKS_CARD_CLASS}
              onHeaderIconClick={openMyTasks}
              headerIconAriaLabel="Meine Aufgaben öffnen"
              onBucketClick={openMyTasksWithBucketFilter}
            />
          </>
        ) : (
          <>
            <OpenApplicationsSummaryCard
              stats={openApplicationsStats}
              className={WORKSPACE_HOME_KPI_CARD_CLASS}
              onHeaderIconClick={
                supportsTableExpand ? maximizeApplicationsTable : undefined
              }
              headerIconAriaLabel="Anträge-Tabelle maximieren"
              onBucketClick={handleOpenApplicationsBucketClick}
              onTotalClick={resetApplicationsTableFilters}
            />
            <AssignedTasksSummaryCard
              buckets={assignedTasksStats.buckets}
              className={
                isCombinedR2R4Role(workspaceRole)
                  ? WORKSPACE_HOME_R2R4_ASSIGNED_TASKS_CARD_CLASS
                  : WORKSPACE_HOME_KPI_CARD_CLASS
              }
              onHeaderIconClick={openMyTasks}
              headerIconAriaLabel="Meine Aufgaben öffnen"
              onBucketClick={openMyTasksWithBucketFilter}
            />
            <ConsultationsThisWeekSummaryCard
              className={WORKSPACE_HOME_KPI_CARD_CLASS}
              applications={applications}
              onHeaderIconClick={openAppointmentPlanner}
              onSelectApplication={onSelectApplication}
            />
          </>
        )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col pb-6",
        supportsTableExpand && isTableMaximized ? "min-h-full gap-0" : "gap-6",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-start justify-between gap-4",
          supportsTableExpand && isTableMaximized && "mb-6",
        )}
      >
        <h1 className={cn(hfTypography.h3, "text-foreground")}>
          {phrase} {name}
        </h1>
        <p className={cn(hfTypography.paragraphSmallMedium, "shrink-0 text-muted-foreground")}>
          {todayLabel}
        </p>
      </header>

      {supportsTableExpand ? (
        <div
          className={cn(
            "grid min-h-0 transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            isTableMaximized
              ? "grid-rows-[0fr] opacity-0 pointer-events-none"
              : "grid-rows-[1fr] opacity-100",
          )}
          aria-hidden={isTableMaximized}
        >
          <div className="flex min-h-0 overflow-hidden">{kpiRow}</div>
        </div>
      ) : (
        kpiRow
      )}

      <section
        className={cn(
          "flex flex-col gap-6 rounded-xl bg-stone-50 p-6 transition-[flex-grow] duration-300 ease-in-out",
          supportsTableExpand && isTableMaximized && "min-h-0 flex-1",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>Anträge</h2>
          {supportsTableExpand ? (
            <TablePanelToggleButton
              expanded={isTableMaximized}
              onToggle={() => setIsTableMaximized((value) => !value)}
            />
          ) : null}
        </div>

        <WorkspaceApplicationsTableToolbar
          searchQuery={tableState.searchQuery}
          onSearchQueryChange={tableState.setSearchQuery}
          showOpenAllToggle
          openAllFilter={tableState.openAllFilter}
          onOpenAllFilterChange={tableState.setOpenAllFilter}
          columnFilters={tableState.columnFilters}
          filterOptions={tableState.filterOptions}
          reviewerDisplayName={reviewerDisplayName}
          onColumnFiltersChange={tableState.setColumnFilters}
          onResetColumnFilters={tableState.resetColumnFilters}
          filteredCount={tableState.filteredCount}
          totalCount={tableState.totalCount}
        />

        <div
          className={cn(
            "w-full min-h-0",
            supportsTableExpand && isTableMaximized
              ? "min-h-0 flex-1 overflow-auto overscroll-contain"
              : "overflow-x-auto",
          )}
        >
          <WorkspaceApplicationsTable
            rows={tableState.displayedRows}
            onSelectApplication={onSelectApplication}
            sort={tableState.sort}
            onSortChange={tableState.setSort}
            totalRowCount={tableState.baseRows.length}
            emptyMessage={
              homeTableApplications.length === 0
                ? "Keine eingegangenen Anträge sichtbar."
                : "Keine Anträge für die aktuelle Filterung."
            }
          />
        </div>
      </section>
    </div>
  );
}
