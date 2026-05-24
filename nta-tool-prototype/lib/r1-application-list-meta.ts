import {
  formatDurationLabel,
  formatReviewSubmittedAt,
} from "@/lib/application-review-labels";
import type { ApplicationRow } from "@/lib/test-flow-types";

function shortApplicationRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function r1ApplicationListNumber(application: ApplicationRow): string {
  const year = new Date(application.created_at).getFullYear();
  return `NTA-${year}-${shortApplicationRef(application.id).slice(-4)}`;
}

export function r1ApplicationDisplayTitle(application: ApplicationRow): string {
  const title = application.data.title?.trim();
  if (title) return title;
  return r1ApplicationListNumber(application);
}

export function formatR1CreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatR1SubmittedDate(application: ApplicationRow): string | null {
  return formatReviewSubmittedAt(application.data);
}

/** Figma Tabellen-Spalte «Gültigkeitsdauer». */
export function formatR1ValidityDuration(application: ApplicationRow): string {
  const duration = application.data.applicationDefinition?.duration;
  if (duration === "one_semester") return "1 Semester";
  if (duration === "full_study") return "Gesamte Studiendauer";
  const label = formatDurationLabel(duration);
  return label === "Keine Angabe" ? "—" : label;
}

/** Figma Tabellen-Spalte «Gültig bis» (vereinfacht aus Einreichung + Dauer). */
export function formatR1ValidUntil(application: ApplicationRow): string {
  const submittedIso = application.data.submittedAt;
  const duration = application.data.applicationDefinition?.duration;

  if (!submittedIso) return "—";
  if (duration === "full_study") return "Ende des Studiums";

  if (duration === "one_semester") {
    const base = new Date(submittedIso);
    if (Number.isNaN(base.getTime())) return "—";
    base.setMonth(base.getMonth() + 6);
    return base.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return "—";
}

export function r1ApplicationDateMeta(application: ApplicationRow): {
  prefix: "Erstellt am" | "Eingereicht am";
  value: string;
} {
  const submitted = formatR1SubmittedDate(application);
  if (submitted) {
    return { prefix: "Eingereicht am", value: submitted };
  }
  return {
    prefix: "Erstellt am",
    value: formatR1CreatedDate(application.created_at),
  };
}
