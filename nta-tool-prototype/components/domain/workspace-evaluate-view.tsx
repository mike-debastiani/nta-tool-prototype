"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  EvaluateFacultyStatusStacks,
  EvaluateHorizontalBars,
  EvaluateMonthlyBars,
  EvaluateProcessDurationCard,
  EvaluateSegmentStrip,
  EvaluateVerticalBars,
  type EvaluateBarItem,
} from "@/components/domain/workspace-evaluate-charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hfTypography } from "@/lib/design-tokens/typography";
import { WORKSPACE_HOME_KPI_ROW_GAP_CLASS } from "@/lib/design-tokens/workspace-dashboard";
import {
  EVALUATE_FACULTY_FILTER_OPTIONS,
  getEvaluateSnapshot,
  type EvaluateDegreeFilter,
  type EvaluateFacultyFilter,
  type EvaluateFilters,
  type EvaluatePeriodMonths,
} from "@/lib/workspace-evaluate-mock-data";
import { cn } from "@/lib/utils";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function formatNumberDe(value: number): string {
  return value.toLocaleString("de-CH");
}

function EvaluateKpiCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[140px] min-w-[200px] flex-1 basis-0 flex-col justify-between rounded-xl bg-stone-50 p-6",
        className,
      )}
    >
      <p className={cn(hfTypography.paragraphSmallMedium, "text-muted-foreground")}>{label}</p>
      <div className="flex flex-col gap-1">
        <p className="text-[2.5rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className={cn(hfTypography.paragraphMiniMedium, "text-muted-foreground")}>{hint}</p>
        ) : null}
      </div>
    </article>
  );
}

function EvaluateCard({
  title,
  children,
  className,
  ariaLabel,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      className={cn("flex flex-col gap-6 rounded-xl bg-stone-50 p-6", className)}
      aria-label={ariaLabel ?? title}
    >
      <h2 className={cn(hfTypography.paragraphLargeMedium, "text-foreground")}>{title}</h2>
      {children}
    </section>
  );
}

function FilterToggleRow({
  label,
  value,
  options,
  onChange,
  inverted = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  inverted?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          EVALUATE_FILTER_LABEL_CLASS,
          inverted ? "text-primary-foreground/90" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full p-[3px]",
          EVALUATE_FILTER_CONTROL_HEIGHT_CLASS,
          inverted
            ? "border border-primary-foreground/25 bg-primary-foreground/10"
            : "border border-border",
        )}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-full min-h-0 items-center justify-center rounded-full px-3 transition-colors",
                EVALUATE_FILTER_TOGGLE_OPTION_CLASS,
                inverted
                  ? active
                    ? "bg-primary-foreground text-primary"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={active}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PERIOD_OPTIONS: { value: EvaluatePeriodMonths; label: string }[] = [
  { value: 6, label: "6 Mon." },
  { value: 12, label: "12 Mon." },
  { value: 24, label: "24 Mon." },
];

const DEGREE_OPTIONS: { value: EvaluateDegreeFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "bachelor", label: "Bachelor" },
  { value: "master", label: "Master" },
];

/** Gleiche Höhe wie Fakultäts-`SelectTrigger` (`h-9`). */
const EVALUATE_FILTER_CONTROL_HEIGHT_CLASS = "h-9";

/** Filterleiste Auswerten: Feldlabels Zeitraum / Bildungsstufe / Fakultät (nur diese Seite). */
const EVALUATE_FILTER_LABEL_CLASS = hfTypography.paragraphMiniMedium;
const EVALUATE_FILTER_TOGGLE_OPTION_CLASS = "text-hf-paragraph-small-medium";

/** `/workspace?view=auswerten` — institutionelle Statistik (R2), Mock-Daten. */
export function WorkspaceEvaluateView() {
  const [periodMonths, setPeriodMonths] = useState<EvaluatePeriodMonths>(12);
  const [faculty, setFaculty] = useState<EvaluateFacultyFilter>("all");
  const [degree, setDegree] = useState<EvaluateDegreeFilter>("all");

  const filters: EvaluateFilters = useMemo(
    () => ({ periodMonths, faculty, degree }),
    [periodMonths, faculty, degree],
  );

  const snapshot = useMemo(() => getEvaluateSnapshot(filters), [filters]);
  const pageDate = pageDateLabel(new Date());

  const statusChartItems: EvaluateBarItem[] = snapshot.statusBuckets.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    value: bucket.value,
    barClass: bucket.barClass,
    textClass: bucket.textClass,
  }));

  const scopeChartItems: EvaluateBarItem[] = snapshot.scopeRanking.map((row, index) => ({
    id: `scope-${index}`,
    label: row.label,
    value: row.count,
    barClass: "bg-beratung-100",
    textClass: "text-beratung-500",
  }));

  const lectureChartItems: EvaluateBarItem[] = snapshot.lectureMeasures.map((row) => ({
    id: row.key,
    label: row.label,
    value: row.count,
    barClass: "bg-in-decision-200",
    textClass: "text-in-decision-800",
  }));

  const assessmentChartItems: EvaluateBarItem[] = snapshot.assessmentMeasures.map((row) => ({
    id: row.key,
    label: row.label,
    value: row.count,
    barClass: "bg-bewilligt-100",
    textClass: "text-bewilligt-700",
  }));

  const facultyChartItems: EvaluateBarItem[] = snapshot.byFaculty.map((row) => ({
    id: row.shortCode,
    label: row.shortCode,
    value: row.count,
    barClass: "bg-primary",
    textClass: "text-foreground",
  }));

  const monthlyPoints = snapshot.monthlySeries.map((month) => ({
    id: month.monthKey,
    label: month.label,
    submitted: month.submitted,
    decided: month.decided,
  }));

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className={cn(hfTypography.h3, "text-foreground")}>Auswerten</h1>
        </div>
        <p className={cn(hfTypography.paragraphSmallMedium, "shrink-0 text-muted-foreground")}>
          {pageDate}
        </p>
      </header>

      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-primary px-6 py-4 text-primary-foreground"
        aria-label="Auswertungsfilter"
      >
        <div className="flex flex-wrap items-center gap-6">
          <FilterToggleRow
            inverted
            label="Zeitraum"
            value={String(periodMonths)}
            options={PERIOD_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            onChange={(value) => setPeriodMonths(Number(value) as EvaluatePeriodMonths)}
          />
          <FilterToggleRow
            inverted
            label="Bildungsstufe"
            value={degree}
            options={DEGREE_OPTIONS}
            onChange={(value) => setDegree(value as EvaluateDegreeFilter)}
          />
        </div>
        <div
          className={cn(
            "flex min-w-[180px] items-center gap-2",
            EVALUATE_FILTER_CONTROL_HEIGHT_CLASS,
          )}
        >
          <span
            className={cn(EVALUATE_FILTER_LABEL_CLASS, "shrink-0 text-primary-foreground/90")}
          >
            Fakultät
          </span>
          <Select value={faculty} onValueChange={(value) => setFaculty(value as EvaluateFacultyFilter)}>
            <SelectTrigger
              className={cn(
                EVALUATE_FILTER_CONTROL_HEIGHT_CLASS,
                EVALUATE_FILTER_TOGGLE_OPTION_CLASS,
                "w-full min-w-[140px] rounded-full border-primary-foreground/30 bg-primary-foreground text-primary shadow-none",
                "hover:bg-primary-foreground/90 data-placeholder:text-primary/60",
                "[&_svg]:text-primary",
                "focus-visible:border-primary-foreground focus-visible:ring-primary-foreground/30",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVALUATE_FACULTY_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn("flex flex-wrap", WORKSPACE_HOME_KPI_ROW_GAP_CLASS)}>
        <EvaluateKpiCard
          label={`Anträge gesamt (${snapshot.periodLabel})`}
          value={formatNumberDe(snapshot.kpis.totalApplications)}
          hint={
            snapshot.kpis.newToday > 0
              ? `+${snapshot.kpis.newToday} heute · +${snapshot.kpis.newThisWeek} diese Woche`
              : undefined
          }
        />
        <EvaluateKpiCard
          label="Offene Verfahren"
          value={formatNumberDe(snapshot.kpis.openPipeline)}
          hint="Review, Anpassung, Entscheid"
        />
        <EvaluateKpiCard
          label="Bewilligungsquote"
          value={`${snapshot.kpis.approvalRatePct} %`}
          hint="Abgeschlossene Verfahren"
        />
        <EvaluateKpiCard
          label="Median Einreichung → Entscheid"
          value={`${snapshot.kpis.medianDaysToDecision} Tage`}
          hint={`Ø ${snapshot.processDurations.averageDays} Tage`}
        />
      </div>

      <EvaluateCard title="Anträge nach Status">
        <EvaluateVerticalBars
          items={statusChartItems}
          barTopRadiusClass="rounded-t-lg"
          maxBarWidthClass="max-w-[56px]"
        />
        <div className="flex flex-wrap gap-4 border-t border-border/50 pt-4">
          <p className={cn(hfTypography.paragraphMiniMedium, "text-muted-foreground")}>
            Pipeline offen: {formatNumberDe(snapshot.kpis.openPipeline)} · Mit Korrekturrunde:{" "}
            {snapshot.kpis.withCorrectionRoundPct} %
          </p>
          <p className={cn(hfTypography.paragraphMiniMedium, "text-muted-foreground")}>
            Antragsart: Studium {formatNumberDe(snapshot.applicationTypes[0]?.count ?? 0)} ·
            Aufnahme {formatNumberDe(snapshot.applicationTypes[1]?.count ?? 0)}
          </p>
        </div>
      </EvaluateCard>

      <EvaluateCard title="Eingänge nach Monat" ariaLabel="Eingänge und Entscheide nach Monat">
        <EvaluateMonthlyBars points={monthlyPoints} />
        <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
          Typische Peaks: Semesterstart (Sep./Okt.) und Prüfungsphase (Feb.); ruhigere Phase im
          Hochsommer.
        </p>
      </EvaluateCard>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <EvaluateCard title="Gültigkeitsdauer">
          <EvaluateSegmentStrip
            segments={snapshot.validityDuration.map((segment) => ({
              id: segment.id,
              label: segment.label,
              value: segment.count,
              barClass:
                segment.id === "full_study" ? "bg-bewilligt-100" : "bg-consultation-surface",
              textClass:
                segment.id === "full_study" ? "text-bewilligt-700" : "text-consultation-accent",
            }))}
          />
        </EvaluateCard>

        <EvaluateCard title="Geltungsbereich">
          <EvaluateHorizontalBars items={scopeChartItems} />
          <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
            Mehrfachnennungen möglich — Werte sind Nennungen, nicht Anträge.
          </p>
        </EvaluateCard>
      </div>

      <EvaluateCard title="Häufigste Massnahmen">
        <div className="grid min-w-0 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h3 className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
              Lehrveranstaltungen
            </h3>
            <EvaluateHorizontalBars items={lectureChartItems} />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
              Leistungsnachweise
            </h3>
            <EvaluateHorizontalBars items={assessmentChartItems} />
          </div>
        </div>
      </EvaluateCard>

      <EvaluateCard title="Bearbeitungsdauer (Prozess)">
        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <EvaluateProcessDurationCard
            title="Gesamtbearbeitungsdauer"
            subtitle="Einreichung → Entscheid"
            days={snapshot.processDurations.totalMedianDays}
            surfaceClass="bg-bewilligt-100"
            textClass="text-bewilligt-700"
          />
          <EvaluateProcessDurationCard
            title="Review Dauer"
            subtitle="Einreichung → Weiterleitung an Entscheid"
            days={snapshot.processDurations.reviewMedianDays}
            surfaceClass="bg-beratung-100"
            textClass="text-beratung-500"
          />
          <EvaluateProcessDurationCard
            title="Entscheidung Dauer"
            subtitle="Entscheid → Bewilligung / Ablehnung"
            days={snapshot.processDurations.inDecisionMedianDays}
            surfaceClass="bg-in-decision-100"
            textClass="text-in-decision-800"
          />
        </div>
      </EvaluateCard>

      {filters.faculty === "all" ? (
        <EvaluateCard title="Statusverteilung je Fakultät" ariaLabel="Anträge nach Status je Fakultät">
          <EvaluateFacultyStatusStacks faculties={snapshot.byFaculty} />
        </EvaluateCard>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <EvaluateCard title="Nach Fakultät">
          <EvaluateHorizontalBars
            items={facultyChartItems}
            className="mb-4"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className={cn(hfTypography.paragraphMiniMedium, "py-2 pr-4 text-muted-foreground")}>
                    Fakultät
                  </th>
                  <th className={cn(hfTypography.paragraphMiniMedium, "py-2 pr-4 text-muted-foreground")}>
                    Anträge
                  </th>
                  <th className={cn(hfTypography.paragraphMiniMedium, "py-2 pr-4 text-muted-foreground")}>
                    Bewilligungsquote
                  </th>
                  <th className={cn(hfTypography.paragraphMiniMedium, "py-2 pr-4 text-muted-foreground")}>
                    Pipeline
                  </th>
                  <th className={cn(hfTypography.paragraphMiniMedium, "py-2 pr-4 text-muted-foreground")}>
                    Abgelehnt
                  </th>
                  <th className={cn(hfTypography.paragraphMiniMedium, "py-2 text-muted-foreground")}>
                    Median Tage
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.byFaculty.map((row) => (
                  <tr key={row.shortCode} className="border-b border-border/60">
                    <td className={cn(hfTypography.paragraphSmallMedium, "py-2.5 pr-4 text-foreground")}>
                      <span title={row.name}>{row.shortCode}</span>
                    </td>
                    <td className={cn(hfTypography.paragraphSmall, "py-2.5 pr-4 tabular-nums")}>
                      {formatNumberDe(row.count)}
                    </td>
                    <td className={cn(hfTypography.paragraphSmall, "py-2.5 pr-4 tabular-nums")}>
                      {row.approvalRatePct} %
                    </td>
                    <td className={cn(hfTypography.paragraphSmall, "py-2.5 pr-4 tabular-nums")}>
                      {formatNumberDe(row.pipelineCount)}
                    </td>
                    <td className={cn(hfTypography.paragraphSmall, "py-2.5 pr-4 tabular-nums")}>
                      {formatNumberDe(row.statusCounts.rejected)}
                    </td>
                    <td className={cn(hfTypography.paragraphSmall, "py-2.5 tabular-nums")}>
                      {row.medianDaysToDecision}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </EvaluateCard>

        <EvaluateCard title="Nach Bildungsstufe">
          <div className="flex flex-col gap-6">
            {snapshot.byDegreeLevel.map((row) => {
              const total = row.approved + row.rejected + row.inPipeline || 1;
              return (
                <div key={row.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                      {row.label}
                    </span>
                    <span className={cn(hfTypography.paragraphSmall, "tabular-nums text-muted-foreground")}>
                      {formatNumberDe(row.count)} Anträge
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full bg-bewilligt-100"
                      style={{ width: `${(row.approved / total) * 100}%` }}
                      title={`Bewilligt: ${row.approved}`}
                    />
                    <div
                      className="h-full bg-abgelehnt-200"
                      style={{ width: `${(row.rejected / total) * 100}%` }}
                      title={`Abgelehnt: ${row.rejected}`}
                    />
                    <div
                      className="h-full bg-beratung-100"
                      style={{ width: `${(row.inPipeline / total) * 100}%` }}
                      title={`Pipeline: ${row.inPipeline}`}
                    />
                  </div>
                  <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                    Bewilligt {row.approved} · Abgelehnt {row.rejected} · Pipeline {row.inPipeline}
                  </p>
                </div>
              );
            })}
          </div>
          <p className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
            Referenz UZH: ca. 70 % Bachelor / 30 % Master in den Antragszahlen.
          </p>
        </EvaluateCard>
      </div>

      <p className={cn(hfTypography.paragraphMini, "text-center text-muted-foreground")}>
      Dies sind generierte Mock-Daten anhand von Richtwerten und nicht live aus der Datenbank.
      </p>
    </div>
  );
}
