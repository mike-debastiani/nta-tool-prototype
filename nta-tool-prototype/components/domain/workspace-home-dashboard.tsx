"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronsUpDown,
  Download,
  Filter,
  MoreVertical,
  Search,
} from "lucide-react";

import { AssignedTasksSummaryCard } from "@/components/domain/assigned-tasks-summary-card";
import { OpenApplicationsSummaryCard } from "@/components/domain/open-applications-summary-card";
import { workspaceApplicationListNumber } from "@/components/domain/application-review-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deriveCanonicalApplicationState,
  getApplicationStatusMeta,
  type StatusAudience,
} from "@/lib/application-status";
import {
  resolveApplicantDisplayName,
  resolveApplicationAssignee,
} from "@/lib/application-assignee";
import { formatReviewSubmittedAt } from "@/lib/application-review-labels";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  WORKSPACE_HOME_KPI_CARD_CLASS,
  WORKSPACE_HOME_KPI_ROW_GAP_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
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

function statusAudienceForRole(role: UserRole): StatusAudience {
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

function PrimaryIconLinkButton() {
  return (
    <button
      type="button"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      aria-label="Details öffnen"
    >
      <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-hf-paragraph-mini-medium",
        className,
      )}
    >
      {label}
    </span>
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
  const statusAudience = statusAudienceForRole(workspaceRole);

  const [searchQuery, setSearchQuery] = useState("");
  const [applicationsFilter, setApplicationsFilter] = useState<ApplicationsFilter>("open");

  const openApplicationsStats = useMemo(
    () => computeOpenApplicationsStats(applications),
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

  const tableRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return applications
      .filter((application) => {
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
      })
      .map((application) => {
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
  }, [
    applications,
    applicationsFilter,
    reviewerDisplayName,
    searchQuery,
    statusAudience,
  ]);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-6 pb-6">
      <header className="flex items-start justify-between gap-4">
        <h1 className={cn(hfTypography.h3, "text-foreground")}>
          {phrase} {name}
        </h1>
        <p className={cn(hfTypography.paragraphSmallMedium, "shrink-0 text-muted-foreground")}>
          {todayLabel}
        </p>
      </header>

      <div className={cn("flex items-stretch", WORKSPACE_HOME_KPI_ROW_GAP_CLASS)}>
        <OpenApplicationsSummaryCard
          stats={openApplicationsStats}
          className={WORKSPACE_HOME_KPI_CARD_CLASS}
        />

        <AssignedTasksSummaryCard
          buckets={assignedTasksStats.buckets}
          className={WORKSPACE_HOME_KPI_CARD_CLASS}
        />

        <div
          className={cn(
            WORKSPACE_HOME_KPI_CARD_CLASS,
            "flex flex-col gap-4 rounded-xl bg-beratung-100 p-6",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
              Beratungen dieser Woche
            </p>
            <PrimaryIconLinkButton />
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
                  <p className={cn(hfTypography.paragraphMiniMedium, "truncate text-foreground")}>
                    {row.name}
                  </p>
                  <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                    {row.room}
                  </p>
                </div>
                <div className="flex w-6 shrink-0 items-center justify-center py-2">
                  <ArrowUpRight className="size-4 text-foreground-alt" strokeWidth={1.75} aria-hidden />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-6 rounded-xl bg-stone-50 p-6">
        <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>Anträge</h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
            <div className="relative w-full max-w-[320px] min-w-[200px] flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Liste durchsuchen…"
                className="h-9 rounded-full border-border bg-background pl-10"
                aria-label="Liste durchsuchen"
              />
            </div>
            <div className="flex items-center rounded-full border border-border p-[3px]">
              <button
                type="button"
                onClick={() => setApplicationsFilter("open")}
                className={cn(
                  "rounded-full px-3 py-1.5",
                  applicationsFilter === "open"
                    ? cn(
                        "border border-border bg-background",
                        hfTypography.paragraphSmallBold,
                        "text-foreground",
                      )
                    : cn(hfTypography.paragraphSmall, "text-muted-foreground"),
                )}
              >
                Offen
              </button>
              <button
                type="button"
                onClick={() => setApplicationsFilter("all")}
                className={cn(
                  "rounded-[10px] px-3 py-1.5",
                  applicationsFilter === "all"
                    ? cn(
                        "border border-border bg-background",
                        hfTypography.paragraphSmallBold,
                        "text-foreground",
                      )
                    : cn(hfTypography.paragraphSmall, "text-muted-foreground"),
                )}
              >
                Alle
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 rounded-full border-border bg-background"
            >
              <Filter className="size-4" strokeWidth={1.75} aria-hidden />
              Filter
            </Button>
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 gap-2 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-4" strokeWidth={1.75} aria-hidden />
            Liste herunterladen
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1068px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Name
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="px-2 py-2 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Studiengang
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="px-2 py-2 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Antragsnummer
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="px-2 py-2 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Datum
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="px-2 py-2 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Status
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="px-2 py-2 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      Zugewiesen an
                    </span>
                    <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                </th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-8 text-center text-hf-paragraph-small text-muted-foreground"
                  >
                    {applications.length === 0
                      ? "Keine eingegangenen Anträge sichtbar."
                      : "Keine Anträge für die aktuelle Filterung."}
                  </td>
                </tr>
              ) : (
                tableRows.map((row, index) => {
                  const isLast = index === tableRows.length - 1;
                  return (
                    <tr
                      key={row.application.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-background/80",
                        !isLast && "border-b border-stone-300",
                      )}
                      onClick={() => onSelectApplication(row.application.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectApplication(row.application.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Antrag ${row.applicantName} öffnen`}
                    >
                      <td className="h-14 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-[10px] font-semibold text-foreground"
                            aria-hidden
                          >
                            {row.applicantInitials}
                          </span>
                          <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                            {row.applicantName}
                          </span>
                        </div>
                      </td>
                      <td className="h-14 px-2">
                        <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                          {row.studiengang}
                        </span>
                      </td>
                      <td className="h-14 px-2">
                        <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                          {row.ref}
                        </span>
                      </td>
                      <td className="h-14 px-2">
                        <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                          {row.date}
                        </span>
                      </td>
                      <td className="h-14 px-2">
                        <StatusBadge label={row.statusLabel} className={row.statusClass} />
                      </td>
                      <td className="h-14 px-2">
                        <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                          {row.assignee}
                        </span>
                      </td>
                      <td className="h-14 px-2">
                        <button
                          type="button"
                          className="inline-flex size-6 items-center justify-center text-foreground-alt"
                          aria-label={`Menü für ${row.applicantName}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreVertical className="size-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
