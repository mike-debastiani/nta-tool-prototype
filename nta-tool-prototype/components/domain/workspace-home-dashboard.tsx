"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, Maximize2, Minimize2 } from "lucide-react";

import { AssignedTasksSummaryCard } from "@/components/domain/assigned-tasks-summary-card";
import { OpenApplicationsSummaryCard } from "@/components/domain/open-applications-summary-card";
import { useWorkspaceApplicationsTableState } from "@/components/domain/use-workspace-applications-table-state";
import { WorkspaceApplicationsTable } from "@/components/domain/workspace-applications-table";
import { WorkspaceApplicationsTableToolbar } from "@/components/domain/workspace-applications-table-toolbar";
import { hfConsultationStatusSurfaceClass } from "@/lib/design-tokens/status-badge-colors";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  WORKSPACE_HOME_KPI_CARD_CLASS,
  WORKSPACE_HOME_KPI_ROW_GAP_CLASS,
  WORKSPACE_HOME_R4_OPEN_CARD_CLASS,
  WORKSPACE_HOME_R4_TASKS_CARD_CLASS,
  WORKSPACE_HOME_TABLE_PANEL_TOGGLE_BUTTON_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
import { computeAllApplicationsStats } from "@/lib/workspace-all-applications-stats";
import { type UserRole } from "@/lib/auth";
import { type WorkspaceApplication } from "@/lib/test-flow-types";
import { computeAssignedTasksStats } from "@/lib/workspace-assigned-tasks-stats";
import { computeOpenApplicationsStats } from "@/lib/workspace-open-applications-stats";
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

const mockAppointments = [
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
  { date: "Dienstag, 11. Juli", time: "08:15", name: "Jaquline Beispielien", room: "Zimmer 404" },
] as const;

function PrimaryIconLinkButton({
  onClick,
  ariaLabel = "Details öffnen",
}: {
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      aria-label={ariaLabel}
    >
      <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
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

  const tableState = useWorkspaceApplicationsTableState({
    applications,
    reviewerDisplayName,
    workspaceRole,
  });

  const isR4Home = workspaceRole === "R4";
  const supportsTableExpand = workspaceRole === "R2" || workspaceRole === "R4";

  const maximizeApplicationsTable = useCallback(() => {
    if (!supportsTableExpand) return;
    tableState.setOpenAllFilter("open");
    setIsTableMaximized(true);
  }, [supportsTableExpand, tableState]);

  const openMyTasks = useCallback(() => {
    router.push("/workspace?view=aufgaben");
  }, [router]);

  const openAppointmentPlanner = useCallback(() => {
    router.push("/workspace?view=terminplaner");
  }, [router]);

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
    <div className={cn("flex items-stretch", WORKSPACE_HOME_KPI_ROW_GAP_CLASS)}>
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
            />
            <AssignedTasksSummaryCard
              buckets={assignedTasksStats.buckets}
              className={WORKSPACE_HOME_R4_TASKS_CARD_CLASS}
              onHeaderIconClick={openMyTasks}
              headerIconAriaLabel="Meine Aufgaben öffnen"
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
            />
            <AssignedTasksSummaryCard
              buckets={assignedTasksStats.buckets}
              className={WORKSPACE_HOME_KPI_CARD_CLASS}
              onHeaderIconClick={openMyTasks}
              headerIconAriaLabel="Meine Aufgaben öffnen"
            />
            <div
              className={cn(
                WORKSPACE_HOME_KPI_CARD_CLASS,
                cn("flex flex-col gap-4 rounded-xl p-6", hfConsultationStatusSurfaceClass),
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
                  Beratungen dieser Woche
                </p>
                <PrimaryIconLinkButton
                  onClick={openAppointmentPlanner}
                  ariaLabel="Beratungen planen öffnen"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {mockAppointments.map((row, index) => (
                  <div
                    key={`${row.date}-${index}`}
                    className="flex items-stretch border-b border-stone-300 last:border-b-0"
                  >
                    <div className="flex w-[113px] shrink-0 flex-col justify-center gap-0.5 px-2 py-2">
                      <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                        {row.date}
                      </p>
                      <p className={cn(hfTypography.paragraphMiniMedium, "text-foreground")}>
                        {row.time}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2 py-2">
                      <p
                        className={cn(
                          hfTypography.paragraphMiniMedium,
                          "truncate text-foreground",
                        )}
                      >
                        {row.name}
                      </p>
                      <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                        {row.room}
                      </p>
                    </div>
                    <div className="flex w-6 shrink-0 items-center justify-center py-2">
                      <ArrowUpRight
                        className="size-4 text-foreground-alt"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
          <div className="min-h-0 overflow-hidden">{kpiRow}</div>
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
              applications.length === 0
                ? "Keine eingegangenen Anträge sichtbar."
                : "Keine Anträge für die aktuelle Filterung."
            }
          />
        </div>
      </section>
    </div>
  );
}
