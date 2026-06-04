/**
 * Auswertungs-Mock — lädt `lib/config/workspace-evaluate-mock.json` als einzige Datenbasis.
 * UZH-Richtwerte 2024, Forschungsprototyp — kein DB-Zugriff.
 */

import evaluateMockDataset from "@/lib/config/workspace-evaluate-mock.json";
import type { CanonicalApplicationState } from "@/lib/application-status";
import { UZH_FACULTIES } from "@/lib/uzh-studiengaenge-data";

export type WorkspaceEvaluateMockDataset = typeof evaluateMockDataset;

/** Rohdaten (JSON) — für Dokumentation / manuelle Anpassungen. */
export const WORKSPACE_EVALUATE_MOCK_DATASET: WorkspaceEvaluateMockDataset =
  evaluateMockDataset;

export type EvaluatePeriodMonths = 6 | 12 | 24;

export type EvaluateFacultyFilter = "all" | (typeof UZH_FACULTIES)[number]["shortCode"];

export type EvaluateDegreeFilter = "all" | "bachelor" | "master";

export type EvaluateFilters = {
  periodMonths: EvaluatePeriodMonths;
  faculty: EvaluateFacultyFilter;
  degree: EvaluateDegreeFilter;
};

export type EvaluateStatusBucket = {
  id: CanonicalApplicationState;
  label: string;
  value: number;
  barClass: string;
  textClass: string;
};

export type EvaluateMeasureRankItem = {
  key: string;
  label: string;
  count: number;
};

export type EvaluateFacultyRow = {
  shortCode: string;
  name: string;
  count: number;
  approvalRatePct: number;
  medianDaysToDecision: number;
  statusCounts: Record<CanonicalApplicationState, number>;
  pipelineCount: number;
};

export type EvaluateDegreeRow = {
  id: "bachelor" | "master";
  label: string;
  count: number;
  approved: number;
  rejected: number;
  inPipeline: number;
};

export type EvaluateMonthlyPoint = {
  monthKey: string;
  label: string;
  submitted: number;
  decided: number;
};

export type EvaluateSnapshot = {
  filters: EvaluateFilters;
  periodLabel: string;
  kpis: {
    totalApplications: number;
    openPipeline: number;
    approvalRatePct: number;
    medianDaysToDecision: number;
    newToday: number;
    newThisWeek: number;
    withCorrectionRoundPct: number;
    ntaStudentsApprox: number;
    totalStudentsApprox: number;
    ntaSharePct: number;
  };
  statusBuckets: EvaluateStatusBucket[];
  applicationTypes: { id: "studium" | "aufnahme"; label: string; count: number }[];
  monthlySeries: EvaluateMonthlyPoint[];
  validityDuration: { id: "full_study" | "one_semester"; label: string; count: number }[];
  scopeRanking: { label: string; count: number }[];
  lectureMeasures: EvaluateMeasureRankItem[];
  assessmentMeasures: EvaluateMeasureRankItem[];
  processDurations: WorkspaceEvaluateMockDataset["processDurations"];
  byFaculty: EvaluateFacultyRow[];
  byDegreeLevel: EvaluateDegreeRow[];
};

export const EVALUATE_STATUS_CHART_META: Record<
  CanonicalApplicationState,
  { label: string; barClass: string; textClass: string }
> = {
  draft: { label: "Entwurf", barClass: "bg-entwurf-200", textClass: "text-entwurf-500" },
  consultation_recommendation: {
    label: "Beratung & Empfehlung",
    barClass: "bg-beratung-200",
    textClass: "text-consultation-accent",
  },
  in_review: {
    label: "In Review",
    barClass: "bg-in-review-200",
    textClass: "text-beratung-500",
  },
  needs_adjustment: {
    label: "Anpassung erforderlich",
    barClass: "bg-adjustment-200",
    textClass: "text-adjustment-600",
  },
  in_decision: {
    label: "In Entscheid",
    barClass: "bg-in-decision-300",
    textClass: "text-in-decision-800",
  },
  approved: {
    label: "Bewilligt",
    barClass: "bg-bewilligt-200",
    textClass: "text-bewilligt-700",
  },
  rejected: {
    label: "Abgelehnt",
    barClass: "bg-abgelehnt-300",
    textClass: "text-abgelehnt-700",
  },
};

const CANONICAL_STATUS_ORDER = Object.keys(
  EVALUATE_STATUS_CHART_META,
) as CanonicalApplicationState[];

const DATASET = WORKSPACE_EVALUATE_MOCK_DATASET;

function roundCount(value: number): number {
  return Math.max(0, Math.round(value));
}

function approvalRateFromStatus(
  status: Record<CanonicalApplicationState, number>,
): number {
  const completed = status.approved + status.rejected;
  if (completed <= 0) return 0;
  return Math.round((status.approved / completed) * 1000) / 10;
}

function pipelineFromStatus(status: Record<CanonicalApplicationState, number>): number {
  return status.in_review + status.needs_adjustment + status.in_decision;
}

function normalizeStatusCounts(
  raw: WorkspaceEvaluateMockDataset["faculties"][number]["statusCounts"],
): Record<CanonicalApplicationState, number> {
  return CANONICAL_STATUS_ORDER.reduce(
    (acc, id) => {
      acc[id] = raw[id] ?? 0;
      return acc;
    },
    {} as Record<CanonicalApplicationState, number>,
  );
}

/** Skaliert Status-Zähler auf `targetTotal` (grösster Rest). */
function scaleStatusCounts(
  base: Record<CanonicalApplicationState, number>,
  targetTotal: number,
): Record<CanonicalApplicationState, number> {
  const baseTotal = CANONICAL_STATUS_ORDER.reduce((sum, id) => sum + base[id], 0);
  if (targetTotal <= 0 || baseTotal <= 0) {
    return Object.fromEntries(
      CANONICAL_STATUS_ORDER.map((id) => [id, 0]),
    ) as Record<CanonicalApplicationState, number>;
  }

  const exact = CANONICAL_STATUS_ORDER.map((id) => ({
    id,
    value: (base[id] / baseTotal) * targetTotal,
  }));

  const floored = exact.map((entry) => ({
    id: entry.id,
    value: Math.floor(entry.value),
    remainder: entry.value - Math.floor(entry.value),
  }));

  const result = Object.fromEntries(
    floored.map((entry) => [entry.id, entry.value]),
  ) as Record<CanonicalApplicationState, number>;

  let remaining = targetTotal - floored.reduce((sum, entry) => sum + entry.value, 0);
  for (const entry of [...floored].sort((a, b) => b.remainder - a.remainder)) {
    if (remaining <= 0) break;
    result[entry.id] += 1;
    remaining -= 1;
  }

  return result;
}

function sumStatusCounts(
  rows: Record<CanonicalApplicationState, number>[],
): Record<CanonicalApplicationState, number> {
  const summed = Object.fromEntries(
    CANONICAL_STATUS_ORDER.map((id) => [id, 0]),
  ) as Record<CanonicalApplicationState, number>;
  for (const row of rows) {
    for (const id of CANONICAL_STATUS_ORDER) {
      summed[id] += row[id];
    }
  }
  return summed;
}

function scaleCounts<T extends { count: number }>(items: T[], factor: number): T[] {
  return items.map((item) => ({ ...item, count: roundCount(item.count * factor) }));
}

function monthSeriesLabels(reference: Date): EvaluateMonthlyPoint[] {
  return DATASET.monthly.map((point, index) => {
    const d = new Date(reference.getFullYear(), reference.getMonth() - (11 - index), 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-CH", { month: "short" }).replace(".", "");
    return {
      monthKey,
      label,
      submitted: point.submitted,
      decided: point.decided,
    };
  });
}

function buildStatusBuckets(
  status: Record<CanonicalApplicationState, number>,
): EvaluateStatusBucket[] {
  return CANONICAL_STATUS_ORDER.map((id) => ({
    id,
    label: EVALUATE_STATUS_CHART_META[id].label,
    value: status[id],
    barClass: EVALUATE_STATUS_CHART_META[id].barClass,
    textClass: EVALUATE_STATUS_CHART_META[id].textClass,
  }));
}

function buildFacultyRow(
  faculty: WorkspaceEvaluateMockDataset["faculties"][number],
  volumeScale: number,
): EvaluateFacultyRow {
  const count = roundCount(faculty.applicationCount * volumeScale);
  const statusCounts = scaleStatusCounts(normalizeStatusCounts(faculty.statusCounts), count);
  return {
    shortCode: faculty.shortCode,
    name: faculty.name,
    count,
    medianDaysToDecision: faculty.medianDaysToDecision,
    statusCounts,
    approvalRatePct: approvalRateFromStatus(statusCounts),
    pipelineCount: pipelineFromStatus(statusCounts),
  };
}

export const EVALUATE_FACULTY_FILTER_OPTIONS: { value: EvaluateFacultyFilter; label: string }[] =
  [
    { value: "all", label: "Alle Fakultäten" },
    ...UZH_FACULTIES.map((f) => ({
      value: f.shortCode as EvaluateFacultyFilter,
      label: f.shortCode,
    })),
  ];

export function getEvaluateSnapshot(
  filters: EvaluateFilters,
  referenceDate: Date = new Date(),
): EvaluateSnapshot {
  const periodScale = DATASET.periodScales[String(filters.periodMonths) as "6" | "12" | "24"];
  const degreeScale = DATASET.degreeShares[filters.degree];
  const volumeScale = periodScale * degreeScale;

  const scaledFaculties = DATASET.faculties.map((faculty) =>
    buildFacultyRow(faculty, volumeScale),
  );

  const facultyRow =
    filters.faculty === "all"
      ? undefined
      : scaledFaculties.find((row) => row.shortCode === filters.faculty);

  const byFaculty =
    filters.faculty === "all" ? scaledFaculties : facultyRow ? [facultyRow] : [];

  const statusScaled =
    filters.faculty === "all"
      ? sumStatusCounts(scaledFaculties.map((row) => row.statusCounts))
      : (facultyRow?.statusCounts ??
        (Object.fromEntries(
          CANONICAL_STATUS_ORDER.map((id) => [id, 0]),
        ) as Record<CanonicalApplicationState, number>));

  const totalApplications = Object.values(statusScaled).reduce((sum, n) => sum + n, 0);
  const facultyVolumeShare = facultyRow
    ? facultyRow.count / DATASET.meta.totalApplications
    : 1;
  const combinedScale = volumeScale * facultyVolumeShare;

  const monthlySeries = monthSeriesLabels(referenceDate).map((month) => ({
    ...month,
    submitted: roundCount(month.submitted * combinedScale),
    decided: roundCount(month.decided * combinedScale),
  }));

  const bachelorBase = DATASET.degreeLevel.bachelor;
  const masterBase = DATASET.degreeLevel.master;

  return {
    filters,
    periodLabel:
      filters.periodMonths === 6
        ? "6 Monate"
        : filters.periodMonths === 24
          ? "24 Monate"
          : "12 Monate",
    kpis: {
      totalApplications,
      openPipeline: pipelineFromStatus(statusScaled),
      approvalRatePct: approvalRateFromStatus(statusScaled),
      medianDaysToDecision:
        facultyRow?.medianDaysToDecision ?? DATASET.processDurations.medianDays,
      newToday: roundCount(DATASET.context.newToday * combinedScale),
      newThisWeek: roundCount(DATASET.context.newThisWeek * combinedScale),
      withCorrectionRoundPct: DATASET.context.withCorrectionRoundPct,
      ntaStudentsApprox: DATASET.context.ntaStudentsApprox,
      totalStudentsApprox: DATASET.context.totalStudentsApprox,
      ntaSharePct: DATASET.context.ntaSharePct,
    },
    statusBuckets: buildStatusBuckets(statusScaled),
    applicationTypes: DATASET.applicationTypes.map((type) => ({
      id: type.id as "studium" | "aufnahme",
      label: type.label,
      count: roundCount(type.count * combinedScale),
    })),
    monthlySeries,
    validityDuration: DATASET.validityDuration.map((segment) => ({
      id: segment.id as "full_study" | "one_semester",
      label: segment.label,
      count: roundCount(segment.count * combinedScale),
    })),
    scopeRanking: scaleCounts(DATASET.scope, combinedScale).sort((a, b) => b.count - a.count),
    lectureMeasures: scaleCounts(DATASET.lectureMeasures, combinedScale),
    assessmentMeasures: scaleCounts(DATASET.assessmentMeasures, combinedScale),
    processDurations: {
      ...DATASET.processDurations,
      medianDays: facultyRow?.medianDaysToDecision ?? DATASET.processDurations.medianDays,
    },
    byFaculty,
    byDegreeLevel: [
      {
        id: "bachelor",
        label: "Bachelor",
        count:
          filters.degree === "master"
            ? 0
            : filters.degree === "bachelor"
              ? totalApplications
              : roundCount(bachelorBase.count * volumeScale * facultyVolumeShare),
        approved: roundCount(bachelorBase.approved * combinedScale),
        rejected: roundCount(bachelorBase.rejected * combinedScale),
        inPipeline: roundCount(bachelorBase.inPipeline * combinedScale),
      },
      {
        id: "master",
        label: "Master",
        count:
          filters.degree === "bachelor"
            ? 0
            : filters.degree === "master"
              ? totalApplications
              : roundCount(masterBase.count * volumeScale * facultyVolumeShare),
        approved: roundCount(masterBase.approved * combinedScale),
        rejected: roundCount(masterBase.rejected * combinedScale),
        inPipeline: roundCount(masterBase.inPipeline * combinedScale),
      },
    ],
  };
}
