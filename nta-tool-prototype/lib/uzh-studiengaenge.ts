import {
  LEGACY_STUDY_PROGRAMS,
  UZH_FACULTIES,
  type UzhFacultySeed,
} from "@/lib/uzh-studiengaenge-data";

export type StudiengangGroup = {
  /** Fakultätsname (Combobox-Gruppentitel). */
  department: string;
  programs: string[];
};

export type StudyProgramMeta = {
  facultyName: string;
  facultySlug: string;
  facultyShortCode: string;
  degreeLevel: "bachelor" | "master" | "other";
};

const programMeta = new Map<string, StudyProgramMeta>();

function registerProgram(
  faculty: UzhFacultySeed,
  name: string,
  degreeLevel: "bachelor" | "master" | "other",
) {
  programMeta.set(name, {
    facultyName: faculty.name,
    facultySlug: faculty.slug,
    facultyShortCode: faculty.shortCode,
    degreeLevel,
  });
}

for (const faculty of UZH_FACULTIES) {
  for (const name of faculty.bachelor) {
    registerProgram(faculty, name, inferDegreeLevelFromLabel(name));
  }
  for (const name of faculty.master) {
    registerProgram(faculty, name, inferDegreeLevelFromLabel(name));
  }
}

for (const legacy of LEGACY_STUDY_PROGRAMS) {
  const faculty = UZH_FACULTIES.find((f) => f.slug === legacy.facultySlug);
  if (!faculty) continue;
  registerProgram(
    faculty,
    legacy.name,
    legacy.degreeLevel === "bachelor" || legacy.degreeLevel === "master"
      ? legacy.degreeLevel
      : inferDegreeLevelFromLabel(legacy.name),
  );
}

export const STUDIENGAENGE: StudiengangGroup[] = UZH_FACULTIES.map((faculty) => ({
  department: faculty.name,
  programs: [...faculty.bachelor, ...faculty.master],
}));

export const UZH_FACULTY_BY_SLUG = Object.fromEntries(
  UZH_FACULTIES.map((f) => [f.slug, f]),
) as Record<string, UzhFacultySeed>;

export function alleStudiengaenge(): string[] {
  return [...programMeta.keys()].sort((a, b) => a.localeCompare(b, "de-CH"));
}

export function getStudyProgramMeta(studiengang?: string): StudyProgramMeta | null {
  const key = studiengang?.trim() ?? "";
  if (!key) return null;
  return programMeta.get(key) ?? null;
}

export function getFacultyNameForStudiengang(studiengang?: string): string {
  return getStudyProgramMeta(studiengang)?.facultyName ?? "—";
}

export function getFacultyShortCodeForStudiengang(studiengang?: string): string {
  return getStudyProgramMeta(studiengang)?.facultyShortCode ?? "—";
}

function inferDegreeLevelFromLabel(name: string): "bachelor" | "master" | "other" {
  const label = name.trim();
  if (
    /^(MA|MSc|MLaw|M Th|M Med)\b/i.test(label)
    || /^M\s/.test(label)
  ) {
    return "master";
  }
  if (
    /^(BA|BSc|BLaw|B Th|B Med)\b/i.test(label)
    || /^B\s/.test(label)
  ) {
    return "bachelor";
  }
  return "other";
}

/** Studienstufe aus gewähltem Studiengang (Bachelor / Master). */
export function studienstufeFromStudiengang(studiengang?: string): string {
  const meta = getStudyProgramMeta(studiengang);
  const level = meta?.degreeLevel ?? inferDegreeLevelFromLabel(studiengang ?? "");
  if (level === "bachelor") return "Bachelor";
  if (level === "master") return "Master";
  return "—";
}
