"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarSync,
  CheckCheck,
  ChevronDown,
  ChevronsUpDown,
  EllipsisVertical,
  Filter,
  Search,
  Settings2,
  Video,
} from "lucide-react";

import { workspaceApplicationListNumber } from "@/components/domain/application-review-blocks";
import { WorkspaceApplicationsTableFilterPopover } from "@/components/domain/workspace-applications-table-filter-popover";
import { Input } from "@/components/ui/input";
import {
  applyWorkspaceTableColumnFilters,
  countActiveWorkspaceTableFilters,
  deriveFacetedWorkspaceTableFilterOptions,
  EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS,
  filterWorkspaceTableRowsBySearch,
  nextWorkspaceTableSort,
  sortWorkspaceApplicationTableRows,
  type WorkspaceTableColumnFilters,
  type WorkspaceTableSort,
  type WorkspaceTableSortColumn,
} from "@/lib/workspace-applications-table-controls";
import { buildWorkspaceApplicationTableRows } from "@/lib/workspace-application-table-rows";
import { hfTypography } from "@/lib/design-tokens/typography";
import {
  WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
  WORKSPACE_HOME_TABLE_FILTER_TOGGLE_CLASS,
  WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
  WORKSPACE_HOME_TABLE_SEARCH_INPUT_CLASS,
  WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS,
} from "@/lib/design-tokens/workspace-dashboard";
import {
  hasReleasedRecommendation,
  isConsultationPhaseApplication,
} from "@/lib/application-status";
import { resolveApplicantDisplayName } from "@/lib/application-assignee";
import type { UserRole } from "@/lib/auth";
import type { WorkspaceApplication } from "@/lib/test-flow-types";
import { parseConsultationStart } from "@/lib/workspace-consultation-appointment";
import { cn } from "@/lib/utils";

type WorkspaceConsultationPlannerViewProps = {
  reviewerDisplayName: string;
  workspaceRole: UserRole;
  applications: WorkspaceApplication[];
  onSelectApplication: (applicationId: string) => void;
};

const WEEKDAY_LABELS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"] as const;
const TERMIN_SORT_COLUMN = "termin";

type ConsultationAppointment = {
  applicationId: string;
  applicantName: string;
  appointmentDate: Date;
  dateKey: string;
  weekdayShortLine: string;
  timeLabel: string;
  locationLabel: string;
  locationType: "zoom" | "onsite";
  releasedToApplicant: boolean;
  listNumber: string;
};

type RecommendationListRow = {
  applicationId: string;
  applicantName: string;
  studiengang: string;
  fakultaet: string;
  fakultaetFullName?: string;
  ref: string;
  terminTime: string;
  terminDate: string;
  terminSortValue: number;
  statusLabel: string;
  statusClass: string;
  assigneeName: string;
  assigneeInitials: string;
};

type PlannerCalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
};

type PlannerSort =
  | { column: WorkspaceTableSortColumn; direction: "asc" | "desc" }
  | { column: typeof TERMIN_SORT_COLUMN; direction: "asc" | "desc" }
  | null;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function monthLabelParts(date: Date): { month: string; year: string } {
  return {
    month: capitalize(date.toLocaleDateString("de-CH", { month: "long" })),
    year: String(date.getFullYear()),
  };
}

function pageDateLabel(date: Date): string {
  return capitalize(
    date.toLocaleDateString("de-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
}

/** 6-Wochen-Raster (Montag zuerst) für den angezeigten Monat. */
function plannerCalendarDays(displayedMonth: Date): PlannerCalendarDay[] {
  const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const mondayFirstOffset = (monthStart.getDay() + 6) % 7;
  gridStart.setDate(1 - mondayFirstOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      key: `${formatDateKey(date)}-${index}`,
      date,
      isCurrentMonth: date.getMonth() === displayedMonth.getMonth(),
    };
  });
}

function normalizeSlotLabel(slot: string): string {
  return slot.replace(/\s*[-–]\s*/g, " – ");
}

/** Prototyp-Heuristik: Mo–Fr gelten als Tage mit verfügbaren Beratungs-Slots. */
function isPotentialAvailabilityDay(date: Date): boolean {
  const weekday = date.getDay();
  return weekday >= 1 && weekday <= 5;
}

/** Reale Beratungstermine aus `applications.data.consultation`. */
/**
 * Adresse als Paar-Schema: «Gebäude, Raum • Strasse, PLZ Ort».
 * Komma-getrennte Teile werden paarweise mit «, » gruppiert, Gruppen mit « • » getrennt.
 */
function formatAppointmentLocation(raw: string | undefined): string {
  const parts =
    raw
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (parts.length === 0) {
    return "UZH Gebäude SBO, Raum E-103 • Schönbergstrasse 15, 8001 Zürich";
  }

  const groups: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    groups.push(parts.slice(index, index + 2).join(", "));
  }
  return groups.join(" • ");
}

/** Hat der Antrag einen real gebuchten Beratungstermin (unabhängig vom Antragsstatus)? */
function hasBookedConsultation(application: WorkspaceApplication): boolean {
  const status = application.data.consultation?.status;
  return status === "booked" || status === "done";
}

function buildConsultationAppointments(
  applications: WorkspaceApplication[],
): ConsultationAppointment[] {
  return applications
    .flatMap((application) => {
      if (!hasBookedConsultation(application)) return [];

      const startsAt = parseConsultationStart(application);
      if (!startsAt) return [];

      const slot = application.data.consultation?.slot?.trim();
      const timeLabel = slot
        ? normalizeSlotLabel(slot)
        : startsAt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });

      const weekdayShortLine = `${capitalize(
        startsAt.toLocaleDateString("de-CH", { weekday: "long" }),
      )}, ${startsAt.toLocaleDateString("de-CH", { day: "numeric", month: "long" })}`;

      const locationLabel = formatAppointmentLocation(application.data.consultation?.location);
      const locationType =
        application.data.consultation?.locationType === "zoom" ? "zoom" : "onsite";

      return [
        {
          applicationId: application.id,
          applicantName: resolveApplicantDisplayName(application),
          appointmentDate: startsAt,
          dateKey: formatDateKey(startsAt),
          weekdayShortLine,
          timeLabel,
          locationLabel,
          locationType,
          releasedToApplicant: hasReleasedRecommendation(application),
          listNumber: workspaceApplicationListNumber(application),
        } satisfies ConsultationAppointment,
      ];
    })
    .sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime());
}

function dayStateClasses(options: {
  isSelected: boolean;
  hasAppointment: boolean;
  isSlotDay: boolean;
  isCurrentMonth: boolean;
}): string {
  const { isSelected, hasAppointment, isSlotDay, isCurrentMonth } = options;
  if (isSelected) {
    return "bg-stone-900 text-stone-50 hover:bg-stone-900";
  }
  if (hasAppointment) {
    return "bg-consultation-surface text-foreground hover:bg-consultation-surface/80";
  }
  if (isSlotDay && isCurrentMonth) {
    return "bg-stone-150 text-foreground hover:bg-stone-150/70";
  }
  return cn(
    "text-muted-foreground hover:bg-stone-100",
    !isCurrentMonth && "opacity-40",
  );
}

export function WorkspaceConsultationPlannerView({
  reviewerDisplayName,
  workspaceRole,
  applications,
  onSelectApplication,
}: WorkspaceConsultationPlannerViewProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const appointments = useMemo(
    () => buildConsultationAppointments(applications),
    [applications],
  );

  // Default: der aktive Tag (heute) ist vorausgewählt; Kalender öffnet im aktuellen Monat.
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [recommendationFilter, setRecommendationFilter] = useState<"open" | "all">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<WorkspaceTableColumnFilters>(
    EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS,
  );
  const [tableSort, setTableSort] = useState<PlannerSort>(null);

  const selectedDateKey = formatDateKey(selectedDate);
  const calendarDays = useMemo(
    () => plannerCalendarDays(displayedMonth),
    [displayedMonth],
  );
  const appointmentDayKeys = useMemo(
    () => new Set(appointments.map((appointment) => appointment.dateKey)),
    [appointments],
  );
  const selectedDayAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.dateKey === selectedDateKey),
    [appointments, selectedDateKey],
  );

  // ── Beratungen & Empfehlungen Liste ──────────────────────────────────────
  const recommendationApplications = useMemo(() => {
    const base = applications.filter((application) =>
      isConsultationPhaseApplication(application),
    );
    if (recommendationFilter === "open") {
      return base.filter((application) => !hasReleasedRecommendation(application));
    }
    return base;
  }, [applications, recommendationFilter]);

  const tableRowsBase = useMemo(
    () =>
      buildWorkspaceApplicationTableRows(recommendationApplications, {
        reviewerDisplayName,
        workspaceRole,
      }),
    [recommendationApplications, reviewerDisplayName, workspaceRole],
  );

  const recommendationRowsByApplicationId = useMemo(() => {
    const map = new Map<string, RecommendationListRow>();
    for (const row of tableRowsBase) {
      const startsAt = parseConsultationStart(row.application);
      const slot = row.application.data.consultation?.slot?.trim();
      const terminTime = slot
        ? normalizeSlotLabel(slot)
        : startsAt
          ? startsAt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })
          : "—";
      const terminDate = startsAt
        ? startsAt.toLocaleDateString("de-CH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "—";
      map.set(row.application.id, {
        applicationId: row.application.id,
        applicantName: row.applicantName,
        studiengang: row.studiengang,
        fakultaet: row.fakultaet,
        fakultaetFullName: row.fakultaetFullName,
        ref: row.ref,
        terminTime,
        terminDate,
        terminSortValue: startsAt?.getTime() ?? 0,
        statusLabel: row.statusLabel,
        statusClass: row.statusClass,
        assigneeName: row.assignee.displayName,
        assigneeInitials: row.assignee.initials,
      });
    }
    return map;
  }, [tableRowsBase]);

  const facetedFilterOptions = useMemo(
    () =>
      deriveFacetedWorkspaceTableFilterOptions(tableRowsBase, columnFilters, {
        reviewerDisplayName,
      }),
    [tableRowsBase, columnFilters, reviewerDisplayName],
  );

  const recommendationListRows = useMemo(() => {
    const afterColumnFilters = applyWorkspaceTableColumnFilters(tableRowsBase, columnFilters, {
      reviewerDisplayName,
    });
    const searchedRows = filterWorkspaceTableRowsBySearch(afterColumnFilters, searchQuery).filter(
      (row) => {
        const plannerRow = recommendationRowsByApplicationId.get(row.application.id);
        if (!plannerRow) return false;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
          plannerRow.terminTime.toLowerCase().includes(query)
          || plannerRow.terminDate.toLowerCase().includes(query)
          || filterWorkspaceTableRowsBySearch([row], searchQuery).length > 0
        );
      },
    );

    const sortedRows = (() => {
      if (!tableSort) return searchedRows;
      if (tableSort.column === TERMIN_SORT_COLUMN) {
        const direction = tableSort.direction === "asc" ? 1 : -1;
        return [...searchedRows].sort((a, b) => {
          const aValue = recommendationRowsByApplicationId.get(a.application.id)?.terminSortValue ?? 0;
          const bValue = recommendationRowsByApplicationId.get(b.application.id)?.terminSortValue ?? 0;
          if (aValue === bValue) return a.ref.localeCompare(b.ref, "de-CH") * direction;
          return (aValue - bValue) * direction;
        });
      }
      return sortWorkspaceApplicationTableRows(searchedRows, {
        column: tableSort.column,
        direction: tableSort.direction,
      } satisfies WorkspaceTableSort);
    })();

    return sortedRows
      .map((row) => recommendationRowsByApplicationId.get(row.application.id))
      .filter((row): row is RecommendationListRow => Boolean(row));
  }, [
    tableRowsBase,
    columnFilters,
    reviewerDisplayName,
    searchQuery,
    tableSort,
    recommendationRowsByApplicationId,
  ]);

  const { month: monthLabel, year: yearLabel } = monthLabelParts(displayedMonth);
  const pageDate = pageDateLabel(new Date());
  const selectedDayHeading = {
    weekday: capitalize(selectedDate.toLocaleDateString("de-CH", { weekday: "long" })),
    shortDate: selectedDate.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }),
  };
  const activeFilterCount = countActiveWorkspaceTableFilters(columnFilters);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6 pb-6">
      <header className="flex items-start justify-between gap-4">
        <h1 className={cn(hfTypography.h3, "text-foreground")}>Beratungen planen</h1>
        <p className={cn(hfTypography.paragraphSmallMedium, "shrink-0 text-muted-foreground")}>
          {pageDate}
        </p>
      </header>

      {/* ── Beratungstermine ───────────────────────────────────────────── */}
      <section
        className="flex flex-col gap-8 rounded-xl bg-stone-50 p-6"
        aria-label="Beratungstermine"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
            Beratungstermine
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={cn(
                WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
                "text-hf-paragraph-small-medium text-foreground",
              )}
            >
              <Settings2 className="size-4" strokeWidth={1.75} aria-hidden />
              Verfügbarkeiten anpassen
            </button>
            <button
              type="button"
              className={cn(
                WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
                "text-hf-paragraph-small-medium text-foreground",
              )}
            >
              <Calendar className="size-4" strokeWidth={1.75} aria-hidden />
              Monat
              <ChevronDown className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:gap-12">
          {/* Kalender (Monat) */}
          <div className="w-full min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <p className={cn(hfTypography.paragraphSmallMedium, "text-stone-900")}>
                {monthLabel}{" "}
                <span className="font-normal text-muted-foreground">{yearLabel}</span>
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full p-2 text-stone-900 transition-colors hover:bg-stone-100"
                  onClick={() =>
                    setDisplayedMonth(
                      new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1),
                    )
                  }
                  aria-label="Vorheriger Monat"
                >
                  <ArrowLeft className="size-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full p-2 text-stone-900 transition-colors hover:bg-stone-100"
                  onClick={() =>
                    setDisplayedMonth(
                      new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1),
                    )
                  }
                  aria-label="Nächster Monat"
                >
                  <ArrowRight className="size-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="flex h-8 items-center justify-center text-hf-paragraph-mini text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const isSelected = sameCalendarDay(day.date, selectedDate);
                  const hasAppointment = appointmentDayKeys.has(formatDateKey(day.date));
                  const isSlotDay = isPotentialAvailabilityDay(day.date);
                  const isToday = sameCalendarDay(day.date, today);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.date);
                        if (!day.isCurrentMonth) {
                          setDisplayedMonth(
                            new Date(day.date.getFullYear(), day.date.getMonth(), 1),
                          );
                        }
                      }}
                      className={cn(
                        "relative flex aspect-square w-full items-center justify-center rounded-xl p-2 text-hf-paragraph-small transition-colors",
                        dayStateClasses({
                          isSelected,
                          hasAppointment,
                          isSlotDay,
                          isCurrentMonth: day.isCurrentMonth,
                        }),
                      )}
                    >
                      {day.date.getDate()}
                      {isToday ? (
                        <span
                          className={cn(
                            "absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                            isSelected ? "bg-stone-50" : "bg-stone-900",
                          )}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Termine des ausgewählten Tages — ab >16″-MacBook (2xl) Breite begrenzen */}
          <div className="flex min-h-0 w-full min-w-0 flex-col gap-4 pt-1 2xl:max-w-[620px]">
            <p className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
              {selectedDayHeading.weekday},{" "}
              <span className="font-normal text-muted-foreground">
                {selectedDayHeading.shortDate}
              </span>
            </p>

            {selectedDayAppointments.length === 0 ? (
              <div className="flex min-h-[120px] items-center rounded-[10px] border border-dashed border-stone-250 px-4 py-5">
                <p className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
                  Keine eingetragenen Termine für den ausgewählten Tag.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDayAppointments.map((appointment) => {
                  const released = appointment.releasedToApplicant;
                  return (
                    <button
                      key={`${appointment.applicationId}-${appointment.dateKey}`}
                      type="button"
                      onClick={() => onSelectApplication(appointment.applicationId)}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-[10px] px-3 py-2 text-left transition-colors",
                        released
                          ? "bg-abgelehnt-100 hover:bg-abgelehnt-100/70"
                          : "bg-consultation-surface hover:bg-consultation-surface/80",
                      )}
                    >
                      <div className="flex min-w-0 items-stretch gap-3">
                        <span
                          className={cn(
                            "w-1 shrink-0 self-stretch rounded-sm",
                            released ? "bg-abgelehnt-600" : "bg-beratung-500",
                          )}
                          aria-hidden
                        />
                        <div className="flex min-w-0 gap-4">
                          <div className="flex w-[120px] shrink-0 flex-col gap-0.5">
                            <p
                              className={cn(
                                "text-hf-paragraph-mini text-muted-foreground",
                                released && "line-through",
                              )}
                            >
                              {appointment.weekdayShortLine}
                            </p>
                            <p
                              className={cn(
                                "text-hf-paragraph-small-medium",
                                released ? "text-foreground line-through" : "text-foreground",
                              )}
                            >
                              {appointment.timeLabel}
                            </p>
                          </div>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <p
                              className={cn(
                                "truncate text-hf-paragraph-small-medium",
                                released ? "text-foreground line-through" : "text-foreground",
                              )}
                            >
                              {appointment.applicantName}
                            </p>
                            {appointment.locationType === "zoom" ? (
                              <span className="inline-flex items-center gap-1 text-hf-paragraph-mini text-muted-foreground">
                                <Video className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                                Teams
                              </span>
                            ) : (
                              <p className="truncate text-hf-paragraph-mini text-muted-foreground">
                                {appointment.locationLabel}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className="flex shrink-0 items-center self-center text-foreground-alt"
                        aria-hidden
                      >
                        <EllipsisVertical className="size-4" strokeWidth={1.75} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-hf-paragraph-small-medium text-foreground"
          >
            <CalendarSync className="size-4" strokeWidth={1.75} aria-hidden />
            Kalender Verknüpfung anpassen
          </button>
          <p className="inline-flex items-center gap-2 text-hf-paragraph-small-medium text-bewilligt-600">
            <CheckCheck className="size-4" strokeWidth={1.75} aria-hidden />
            Mit Outlook-Kalender verknüpft
          </p>
        </div>
      </section>

      {/* ── Beratungen & Empfehlungen Liste ────────────────────────────── */}
      <section
        className="flex min-h-0 flex-1 flex-col gap-6 rounded-xl bg-stone-50 p-6"
        aria-label="Beratungen & Empfehlungen Liste"
      >
        <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>
          Beratungen &amp; Empfehlungen Liste
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className={WORKSPACE_HOME_TABLE_SEARCH_WRAPPER_CLASS}>
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
            role="group"
            aria-label="Offene oder alle Beratungen"
          >
            <button
              type="button"
              onClick={() => setRecommendationFilter("open")}
              className={cn(
                "text-hf-paragraph-small-bold",
                recommendationFilter === "open"
                  ? WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS
                  : WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
              )}
            >
              Offen
            </button>
            <button
              type="button"
              onClick={() => setRecommendationFilter("all")}
              className={cn(
                "text-hf-paragraph-small-bold",
                recommendationFilter === "all"
                  ? WORKSPACE_HOME_TABLE_FILTER_TAB_ACTIVE_CLASS
                  : WORKSPACE_HOME_TABLE_FILTER_TAB_INACTIVE_CLASS,
              )}
            >
              Alle
            </button>
          </div>

          <WorkspaceApplicationsTableFilterPopover
            filters={columnFilters}
            options={facetedFilterOptions}
            reviewerDisplayName={reviewerDisplayName}
            onFiltersChange={setColumnFilters}
            onReset={() => setColumnFilters(EMPTY_WORKSPACE_TABLE_COLUMN_FILTERS)}
            trigger={
              <button
                type="button"
                className={cn(
                  WORKSPACE_HOME_TABLE_OUTLINE_BUTTON_CLASS,
                  "text-hf-paragraph-small-medium text-foreground",
                )}
                aria-label={
                  activeFilterCount > 0 ? `Filter (${activeFilterCount} aktiv)` : "Filter"
                }
              >
                <Filter className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="ml-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-semibold leading-none text-stone-50">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            }
          />
        </div>

        <RecommendationTable
          rows={recommendationListRows}
          sort={tableSort}
          onSortChange={setTableSort}
          onSelectApplication={onSelectApplication}
        />
      </section>
    </div>
  );
}

const TABLE_COLUMNS: {
  id: WorkspaceTableSortColumn | typeof TERMIN_SORT_COLUMN;
  label: string;
}[] = [
  { id: "applicantName", label: "Name" },
  { id: "studiengang", label: "Studiengang" },
  { id: "fakultaet", label: "Fakultät" },
  { id: "ref", label: "Antrags ID" },
  { id: TERMIN_SORT_COLUMN, label: "Termin" },
  { id: "statusLabel", label: "Status" },
  { id: "assignee", label: "Zugewiesen an" },
];

function RecommendationTable({
  rows,
  sort,
  onSortChange,
  onSelectApplication,
}: {
  rows: RecommendationListRow[];
  sort: PlannerSort;
  onSortChange: (next: PlannerSort) => void;
  onSelectApplication: (applicationId: string) => void;
}) {
  function handleSort(columnId: WorkspaceTableSortColumn | typeof TERMIN_SORT_COLUMN) {
    if (columnId === TERMIN_SORT_COLUMN) {
      onSortChange(
        !sort || sort.column !== TERMIN_SORT_COLUMN
          ? { column: TERMIN_SORT_COLUMN, direction: "asc" }
          : sort.direction === "asc"
            ? { column: TERMIN_SORT_COLUMN, direction: "desc" }
            : null,
      );
      return;
    }
    onSortChange(
      nextWorkspaceTableSort(
        sort && sort.column !== TERMIN_SORT_COLUMN ? (sort as WorkspaceTableSort) : null,
        columnId,
      ) as PlannerSort,
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[64rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {TABLE_COLUMNS.map((column) => (
              <th key={column.id} className="px-2 py-2 align-middle">
                <button
                  type="button"
                  onClick={() => handleSort(column.id)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md py-0.5 text-foreground transition-colors hover:bg-stone-100/80"
                  aria-label={`Nach ${column.label} sortieren`}
                >
                  <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                    {column.label}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </th>
            ))}
            <th className="w-10 px-2 py-2" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={TABLE_COLUMNS.length + 1} className="px-2 py-8 text-center">
                <span className={cn(hfTypography.paragraphSmall, "text-muted-foreground")}>
                  Keine Einträge für die aktuelle Auswahl.
                </span>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={row.applicationId}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-background/80",
                  index < rows.length - 1 && "border-b border-border",
                )}
                onClick={() => onSelectApplication(row.applicationId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectApplication(row.applicationId);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Antrag ${row.applicantName} öffnen`}
              >
                <td className="h-14 px-2 align-middle whitespace-nowrap">
                  <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                    {row.applicantName}
                  </span>
                </td>
                <td className="h-14 px-2 align-middle">
                  <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                    {row.studiengang}
                  </span>
                </td>
                <td className="h-14 px-2 align-middle whitespace-nowrap">
                  <span
                    className={cn(hfTypography.paragraphSmall, "text-foreground")}
                    title={row.fakultaetFullName}
                  >
                    {row.fakultaet}
                  </span>
                </td>
                <td className="h-14 px-2 align-middle whitespace-nowrap">
                  <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                    {row.ref}
                  </span>
                </td>
                <td className="h-14 px-2 align-middle whitespace-nowrap">
                  <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                    {row.terminTime}
                    <br aria-hidden />
                    <span className="text-muted-foreground">{row.terminDate}</span>
                  </span>
                </td>
                <td className="h-14 px-2 align-middle">
                  <span
                    className={cn(
                      "inline-flex w-max items-center whitespace-nowrap rounded-lg px-2 py-0.5",
                      hfTypography.paragraphMiniMedium,
                      "font-medium",
                      row.statusClass,
                    )}
                  >
                    {row.statusLabel}
                  </span>
                </td>
                <td className="h-14 px-2 align-middle whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-150 text-[10px] font-semibold text-foreground">
                      {row.assigneeInitials}
                    </span>
                    <span className={cn(hfTypography.paragraphSmall, "text-foreground")}>
                      {row.assigneeName}
                    </span>
                  </div>
                </td>
                <td className="h-14 w-10 px-2 align-middle">
                  <button
                    type="button"
                    className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-foreground-alt hover:bg-stone-100/80"
                    aria-label={`Menü für ${row.applicantName}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <EllipsisVertical className="size-4" strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
