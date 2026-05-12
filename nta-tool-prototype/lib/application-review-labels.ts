import { type ApplicationData } from "@/lib/test-flow-types";

/** Mirrors labels used in `nta-antrag-desktop.tsx` for consistent review display. */
export const APPLICATION_SCOPE_OPTIONS = [
  "Schriftliche Prüfungen",
  "Mündliche Prüfungen",
  "Schriftliche Arbeiten",
  "Während Lehrveranstaltungen",
  "Praktika",
] as const;

/** Einheitliches Format (vgl. Figma Prototyp shadcn Kit — Massnahmen-Karten). */
export type ApplicationMeasureOption = {
  readonly key: string;
  readonly title: string;
  readonly description: string;
};

/** Ausgleichsmassnahmen für Lehrveranstaltungen (Keys m1–m7 in `lectureMeasures`). */
export const LECTURE_MEASURE_OPTIONS = [
  {
    key: "m1",
    title: "Einsatz technischer Hilfsmittel",
    description:
      "Nutzung von Hilfsmitteln wie Notebook, Screenreader oder anderen technischen Geräten während Prüfungen.",
  },
  {
    key: "m2",
    title: "Anpassung der Prüfungsunterlagen",
    description:
      "Prüfungsunterlagen werden in einer angepassten Schriftart, -grösse oder -farbe bereitgestellt, um die Lesbarkeit zu verbessern.",
  },
  {
    key: "m3",
    title: "Einsatz personeller Unterstützung",
    description:
      "Begleitung durch eine Assistenzperson während der Prüfung, z.B. Gebärdensprachdolmetscher oder Schreibassistenz.",
  },
  {
    key: "m4",
    title: "Zeitverlängerung",
    description:
      "Verlängerung der Prüfungszeit um einen festgelegten Prozentsatz oder eine definierte Zeitspanne.",
  },
  {
    key: "m5",
    title: "Angepasste Pausenregelung",
    description:
      "Individuelle Pausengestaltung während Prüfungen, z.B. zusätzliche oder längere Pausen.",
  },
  {
    key: "m6",
    title: "Separater Prüfungsraum",
    description:
      "Durchführung schriftlicher Prüfungen in einem separaten Raum, um Ablenkungen zu minimieren.",
  },
  {
    key: "m7",
    title: "Mündliche statt schriftliche Prüfung",
    description:
      "Ersatz einer schriftlichen Prüfung durch eine gleichwertige mündliche Prüfungsform.",
  },
] as const satisfies readonly ApplicationMeasureOption[];

/** Ausgleichsmassnahmen für Leistungsnachweise (Keys m1–m6 in `assessmentMeasures`). */
export const ASSESSMENT_MEASURE_OPTIONS = [
  {
    key: "m1",
    title: "Zusätzliche Pausen",
    description:
      "Möglichkeit, während Lehrveranstaltungen zusätzliche Pausen einzulegen.",
  },
  {
    key: "m2",
    title: "Einzelarbeit statt Gruppenarbeit",
    description:
      "Gruppenarbeiten können durch gleichwertige Einzelarbeiten ersetzt werden.",
  },
  {
    key: "m3",
    title: "Angepasste Präsenzpflicht",
    description:
      "Die Präsenzpflicht wird individuell angepasst, z.B. durch reduzierte Anwesenheitspflicht oder alternative Nachweisformen.",
  },
  {
    key: "m4",
    title: "Audioaufnahme-Erlaubnis",
    description:
      "Lehrveranstaltungen dürfen zu persönlichen Lernzwecken aufgezeichnet werden.",
  },
  {
    key: "m5",
    title: "Reservierter Sitzplatz",
    description:
      "Ein fester Sitzplatz wird reserviert, z.B. in der Nähe des Ausgangs, eines Fensters oder der Lehrperson.",
  },
  {
    key: "m6",
    title: "Kein unaufgefordertes Aufrufen",
    description:
      "Die Lehrperson verzichtet darauf, die betroffene Person unaufgefordert mündlich aufzurufen.",
  },
] as const satisfies readonly ApplicationMeasureOption[];

export type LectureMeasureKey = (typeof LECTURE_MEASURE_OPTIONS)[number]["key"];
export type AssessmentMeasureKey = (typeof ASSESSMENT_MEASURE_OPTIONS)[number]["key"];

const LECTURE_TITLE_MAP = Object.fromEntries(
  LECTURE_MEASURE_OPTIONS.map((o) => [o.key, o.title]),
) as Record<LectureMeasureKey, string>;

const ASSESSMENT_TITLE_MAP = Object.fromEntries(
  ASSESSMENT_MEASURE_OPTIONS.map((o) => [o.key, o.title]),
) as Record<AssessmentMeasureKey, string>;

export function labelForLectureMeasureKey(key: string): string {
  return LECTURE_TITLE_MAP[key as LectureMeasureKey] ?? key;
}

export function labelForAssessmentMeasureKey(key: string): string {
  return ASSESSMENT_TITLE_MAP[key as AssessmentMeasureKey] ?? key;
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
