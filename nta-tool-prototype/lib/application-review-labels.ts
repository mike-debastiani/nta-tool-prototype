import { type ApplicationData } from "@/lib/test-flow-types";

/** Mirrors labels used in `nta-antrag-desktop.tsx` for consistent review display. */
export const APPLICATION_SCOPE_OPTIONS = [
  "Schriftliche Prüfungen",
  "Mündliche Prüfungen",
  "Schriftliche Arbeiten",
  "Während Lehrveranstaltungen",
  "Praktika",
] as const;

export const APPLICATION_MEASURE_OPTIONS = [
  { key: "m1", label: "Massnahme 1" },
  { key: "m2", label: "Massnahme 2" },
  { key: "m3", label: "Massnahme 3" },
  { key: "m4", label: "Massnahme 4" },
] as const;

export type MeasureKey = (typeof APPLICATION_MEASURE_OPTIONS)[number]["key"];

const MEASURE_LABEL_MAP = Object.fromEntries(
  APPLICATION_MEASURE_OPTIONS.map((o) => [o.key, o.label]),
) as Record<MeasureKey, string>;

export function labelForMeasureKey(key: string): string {
  return MEASURE_LABEL_MAP[key as MeasureKey] ?? key;
}

export function formatDurationLabel(
  duration?: "full_study" | "one_semester",
): string {
  if (duration === "full_study") return "Gesamte Studiendauer";
  if (duration === "one_semester") return "Einmalig für ein Semester";
  return "Keine Angabe";
}

export function formatReviewSubmittedAt(data: ApplicationData): string | null {
  if (!data.submittedAt) return null;
  try {
    return new Date(data.submittedAt).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
