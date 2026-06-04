"use client";

import type { CanonicalApplicationState } from "@/lib/application-status";
import {
  EVALUATE_STATUS_CHART_META,
  type EvaluateFacultyRow,
} from "@/lib/workspace-evaluate-mock-data";
import { hfTypography } from "@/lib/design-tokens/typography";
import { cn } from "@/lib/utils";

const FACULTY_STACK_STATUS_ORDER: CanonicalApplicationState[] = [
  "draft",
  "consultation_recommendation",
  "in_review",
  "needs_adjustment",
  "in_decision",
  "approved",
  "rejected",
];

const BAR_GAP_PX = 12;

export type EvaluateBarItem = {
  id: string;
  label: string;
  value: number;
  barClass: string;
  textClass: string;
};

export function EvaluateVerticalBars({
  items,
  className,
  minBarHeightPct = 8,
  barTopRadiusClass = "rounded-t-xl",
  maxBarWidthClass = "max-w-[48px]",
}: {
  items: EvaluateBarItem[];
  className?: string;
  minBarHeightPct?: number;
  barTopRadiusClass?: string;
  maxBarWidthClass?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div
      className={cn("flex h-[220px] min-h-0 w-full min-w-0 items-end", className)}
      style={{ gap: BAR_GAP_PX }}
      role="img"
      aria-label="Balkendiagramm"
    >
      {items.map((item) => {
        const heightPct = Math.max((item.value / max) * 100, item.value > 0 ? minBarHeightPct : 0);
        return (
          <div
            key={item.id}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <span
              className={cn(
                hfTypography.paragraphSmallMedium,
                "whitespace-nowrap tabular-nums",
                item.textClass,
              )}
            >
              {item.value}
            </span>
            <div className="relative flex h-[160px] w-full min-w-0 items-end justify-center">
              <div
                className={cn("w-full", maxBarWidthClass, barTopRadiusClass, item.barClass)}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span
              className={cn(
                hfTypography.paragraphMiniMedium,
                "line-clamp-2 w-full text-center text-muted-foreground",
              )}
              title={item.label}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function EvaluateHorizontalBars({
  items,
  showValues = true,
  className,
}: {
  items: EvaluateBarItem[];
  showValues?: boolean;
  className?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className={cn("flex flex-col gap-3", className)} role="list">
      {items.map((item) => {
        const widthPct = (item.value / max) * 100;
        return (
          <li key={item.id} className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn(hfTypography.paragraphSmallMedium, "min-w-0 truncate text-foreground")}>
                {item.label}
              </span>
              {showValues ? (
                <span
                  className={cn(
                    hfTypography.paragraphSmallMedium,
                    "shrink-0 tabular-nums",
                    item.textClass,
                  )}
                >
                  {item.value}
                </span>
              ) : null}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={cn("h-full rounded-full transition-[width]", item.barClass)}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function EvaluateSegmentStrip({
  segments,
  className,
}: {
  segments: { id: string; label: string; value: number; barClass: string; textClass: string }[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label="Anteile"
      >
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={cn("h-full min-w-0", segment.barClass)}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
        {segments.map((segment) => {
          const pct = Math.round((segment.value / total) * 100);
          return (
            <li key={segment.id} className="flex items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-full", segment.barClass)} aria-hidden />
              <span className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}>
                {segment.label}
              </span>
              <span className={cn(hfTypography.paragraphSmallMedium, "tabular-nums", segment.textClass)}>
                {segment.value}
                <span className="text-muted-foreground"> ({pct} %)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EvaluateMonthlyBars({
  points,
  className,
}: {
  points: { id: string; label: string; submitted: number; decided: number }[];
  className?: string;
}) {
  const max = Math.max(...points.map((p) => Math.max(p.submitted, p.decided)), 1);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary" aria-hidden />
          <span className={cn(hfTypography.paragraphMiniMedium, "text-muted-foreground")}>
            Eingänge
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-stone-400" aria-hidden />
          <span className={cn(hfTypography.paragraphMiniMedium, "text-muted-foreground")}>
            Entscheide
          </span>
        </span>
      </div>
      <div
        className="flex h-[200px] min-h-0 w-full min-w-0 items-end"
        style={{ gap: 6 }}
        role="img"
        aria-label="Monatliche Eingänge und Entscheide"
      >
        {points.map((point) => {
          const submittedPct = (point.submitted / max) * 100;
          const decidedPct = (point.decided / max) * 100;
          return (
            <div
              key={point.id}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <div className="flex h-[160px] w-full items-end justify-center gap-0.5">
                <div
                  className="w-[42%] max-w-[14px] rounded-t-md bg-primary"
                  style={{ height: `${Math.max(submittedPct, point.submitted > 0 ? 6 : 0)}%` }}
                  title={`Eingänge: ${point.submitted}`}
                />
                <div
                  className="w-[42%] max-w-[14px] rounded-t-md bg-stone-400"
                  style={{ height: `${Math.max(decidedPct, point.decided > 0 ? 6 : 0)}%` }}
                  title={`Entscheide: ${point.decided}`}
                />
              </div>
              <span className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Gestapelte Statusverteilung je Fakultät (Daten aus JSON-Mock). */
export function EvaluateFacultyStatusStacks({
  faculties,
  className,
}: {
  faculties: EvaluateFacultyRow[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-4", className)} role="list">
      {faculties.map((faculty) => {
        const total = faculty.count || 1;
        return (
          <li key={faculty.shortCode} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span
                className={cn(hfTypography.paragraphSmallMedium, "text-foreground")}
                title={faculty.name}
              >
                {faculty.shortCode}
              </span>
              <span className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                {faculty.count} Anträge · Quote {faculty.approvalRatePct} % · Pipeline{" "}
                {faculty.pipelineCount}
              </span>
            </div>
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-stone-200"
              role="img"
              aria-label={`Statusverteilung ${faculty.shortCode}`}
            >
              {FACULTY_STACK_STATUS_ORDER.map((statusId) => {
                const value = faculty.statusCounts[statusId];
                if (value <= 0) return null;
                const meta = EVALUATE_STATUS_CHART_META[statusId];
                return (
                  <div
                    key={statusId}
                    className={cn("h-full min-w-0", meta.barClass)}
                    style={{ width: `${(value / total) * 100}%` }}
                    title={`${meta.label}: ${value}`}
                  />
                );
              })}
            </div>
          </li>
        );
      })}
      <li className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
        {FACULTY_STACK_STATUS_ORDER.map((statusId) => {
          const meta = EVALUATE_STATUS_CHART_META[statusId];
          return (
            <span
              key={statusId}
              className="inline-flex items-center gap-1.5"
            >
              <span className={cn("size-2 shrink-0 rounded-full", meta.barClass)} aria-hidden />
              <span className={cn(hfTypography.paragraphMini, "text-muted-foreground")}>
                {meta.label}
              </span>
            </span>
          );
        })}
      </li>
    </ul>
  );
}
