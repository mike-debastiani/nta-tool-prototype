"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";

import { AssignedTasksSummaryCard } from "@/components/domain/assigned-tasks-summary-card";
import { OpenApplicationsSummaryCard } from "@/components/domain/open-applications-summary-card";
import { workspaceApplicationListNumber } from "@/components/domain/application-review-blocks";
import { WorkspaceApplicationsTable } from "@/components/domain/workspace-applications-table";
import { Input } from "@/components/ui/input";
import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import { deriveCanonicalApplicationState } from "@/lib/application-status";
import { buildWorkspaceApplicationTableRows } from "@/lib/workspace-application-table-rows";
import { hfConsultationStatusSurfaceClass } from "@/lib/design-tokens/status-badge-colors";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  WORKSPACE_HOME_KPI_CARD_CLASS,
  WORKSPACE_HOME_KPI_ROW_GAP_CLASS,
  WORKSPACE_HOME_R4_OPEN_CARD_CLASS,
  WORKSPACE_HOME_R4_TASKS_CARD_CLASS,
  WORKSPACE_HOME_TABLE_DOWNLOAD_BUTTON_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TOGGLE_CLASS,
  WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
  WORKSPACE_HOME_TABLE_PANEL_TOGGLE_BUTTON_CLASS,
  WORKSPACE_HOME_TABLE_SEARCH_INPUT_CLASS,
  WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS,
  WORKSPACE_HOME_TABLE_TOOLBAR_LEFT_CLASS,
  WORKSPACE_HOME_TABLE_TOOLBAR_ROW_CLASS,
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

type ApplicationsFilter = "open" | "all";

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

function isOpenApplication(application: WorkspaceApplication): boolean {
  const state = deriveCanonicalApplicationState(application);
  return state !== "approved" && state !== "rejected";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [applicationsFilter, setApplicationsFilter] = useState<ApplicationsFilter>("open");
  const [isTableMaximized, setIsTableMaximized] = useState(false);
  const router = useRouter();

  const isR4Home = workspaceRole === "R4";
  const supportsTableExpand = workspaceRole === "R2" || workspaceRole === "R4";

  const maximizeApplicationsTable = useCallback(() => {
    if (!supportsTableExpand) return;
    setApplicationsFilter("open");
    setIsTableMaximized(true);
  }, [supportsTableExpand]);

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

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return applications.filter((application) => {
      if (applicationsFilter === "open" && !isOpenApplication(application)) {
        return false;
      }
      if (!q) return true;

      const applicantName = resolveApplicantDisplayName(application).toLowerCase();
      const studiengang = (application.data.personalData?.studiengang ?? "").toLowerCase();
      const ref = workspaceApplicationListNumber(application).toLowerCase();

      return (
        applicantName.includes(q)
        || studiengang.includes(q)
        || ref.includes(q)
      );
    });
  }, [applications, applicationsFilter, reviewerDisplayName, searchQuery, workspaceRole]);

  const tableRows = useMemo(
    () =>
      buildWorkspaceApplicationTableRows(filteredApplications, {
        reviewerDisplayName,
        workspaceRole,
      }),
    [filteredApplications, reviewerDisplayName, workspaceRole],
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

        <div className={WORKSPACE_HOME_TABLE_TOOLBAR_ROW_CLASS} data-node-id="5948:27470">
          <div className={WORKSPACE_HOME_TABLE_TOOLBAR_LEFT_CLASS} data-node-id="5948:27472">
            <div className={WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS} data-node-id="5957:22502">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Liste durchsuchen…"
                className={WORKSPACE_HOME_TABLE_SEARCH_INPUT_CLASS}
                aria-label="Liste durchsuchen"
              />
            </div>
            <div
              className={WORKSPACE_HOME_TABLE_FILTER_TOGGLE_CLASS}
              data-node-id="5948:27474"
              role="group"
              aria-label="Anträge filtern"
            >
              <button
                type="button"
                onClick={() => setApplicationsFilter("open")}
                className={cn(
                  "text-hf-paragraph-small-bold",
                  applicationsFilter === "open"
                    ? WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS
                    : WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
                )}
              >
                Offen
              </button>
              <button
                type="button"
                onClick={() => setApplicationsFilter("all")}
                className={cn(
                  "text-hf-paragraph-small-bold",
                  applicationsFilter === "all"
                    ? WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS
                    : WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
                )}
              >
                Alle
              </button>
            </div>
            <button
              type="button"
              className={cn(
                WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
                "text-hf-paragraph-small-medium text-foreground",
              )}
              data-node-id="5948:27481"
            >
              <Filter className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Filter
            </button>
          </div>
          <button
            type="button"
            className={cn(
              WORKSPACE_HOME_TABLE_DOWNLOAD_BUTTON_CLASS,
              "text-hf-paragraph-small-medium text-foreground",
            )}
            data-node-id="5948:27482"
          >
            <Download className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Liste herunterladen
          </button>
        </div>

        <div
          className={cn(
            "w-full min-h-0",
            supportsTableExpand && isTableMaximized
              ? "min-h-0 flex-1 overflow-auto overscroll-contain"
              : "overflow-x-auto",
          )}
        >
          <WorkspaceApplicationsTable
            rows={tableRows}
            onSelectApplication={onSelectApplication}
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
